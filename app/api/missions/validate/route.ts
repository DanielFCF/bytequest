import { judgeCensor, scanLines } from "@/lib/dlp";
import { getMission, isSectorId } from "@/lib/missions";
import { getCards } from "@/lib/rapidfire";
import type { ValidationRequest, ValidationResponse } from "@/lib/types";

// ============================================================
// Correção e pontuação — SEMPRE no servidor.
//
// Modelo pedagógico: errar não encerra a missão. A cada tentativa
// o XP desce um degrau até o piso, e ao esgotar os escudos a
// missão entra em MODO GUIADO — o servidor revela onde estava a
// ameaça e o colaborador termina o exercício aprendendo.
// ============================================================

/** Degraus de XP por tentativa (1-based). Depois disso, o piso. */
const XP_STEPS = [150, 110, 80];
const XP_FLOOR = 50;
const HINT_PENALTY = 30;
/** tentativas erradas até abrir o Modo Guiado */
export const SHIELDS = 3;

function award(attempt: number, hintUsed: boolean): number {
  const step = XP_STEPS[attempt - 1] ?? XP_FLOOR;
  return Math.max(XP_FLOOR, step - (hintUsed ? HINT_PENALTY : 0));
}

/** Type guard manual — sem confiar no shape do corpo recebido. */
function parseBody(raw: unknown): ValidationRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;

  if (!isSectorId(body.sectorId)) return null;
  if (typeof body.missionId !== "string" || body.missionId.length > 64) return null;

  const hintUsed = body.hintUsed === true;
  const attempt =
    typeof body.attempt === "number" && Number.isInteger(body.attempt)
      ? Math.min(Math.max(body.attempt, 1), 99)
      : 1;

  if (body.kind === "choice") {
    if (typeof body.optionId !== "string" || body.optionId.length > 16) return null;
    return {
      kind: "choice",
      sectorId: body.sectorId,
      missionId: body.missionId,
      optionId: body.optionId,
      hintUsed,
      attempt,
    };
  }

  if (body.kind === "spot" || body.kind === "sequence") {
    const ids = body.kind === "spot" ? body.flaggedIds : body.orderedIds;
    if (!Array.isArray(ids) || ids.length > 50) return null;
    if (!ids.every((id) => typeof id === "string" && id.length <= 16)) return null;
    const unique = [...new Set(ids as string[])];
    return body.kind === "spot"
      ? { kind: "spot", sectorId: body.sectorId, missionId: body.missionId, flaggedIds: unique, hintUsed, attempt }
      : { kind: "sequence", sectorId: body.sectorId, missionId: body.missionId, orderedIds: unique, hintUsed, attempt };
  }

  if (body.kind === "quiz") {
    const answers = body.answers;
    if (!Array.isArray(answers) || answers.length === 0 || answers.length > 20) return null;
    const parsed: Array<{ questionId: string; optionId: string | null }> = [];
    for (const item of answers) {
      if (typeof item !== "object" || item === null) return null;
      const entry = item as Record<string, unknown>;
      if (typeof entry.questionId !== "string" || entry.questionId.length > 32) return null;
      const opt = entry.optionId;
      if (opt !== null && (typeof opt !== "string" || opt.length > 16)) return null;
      parsed.push({ questionId: entry.questionId, optionId: opt });
    }
    return {
      kind: "quiz",
      sectorId: body.sectorId,
      missionId: body.missionId,
      hintUsed,
      attempt,
      answers: parsed,
      timedOut: body.timedOut === true,
    };
  }

  if (body.kind === "rapid") {
    const answers = body.answers;
    if (!Array.isArray(answers) || answers.length === 0 || answers.length > 20) return null;
    const parsed: Array<{ cardId: string; verdict: "safe" | "scam" | "timeout" }> = [];
    for (const item of answers) {
      if (typeof item !== "object" || item === null) return null;
      const entry = item as Record<string, unknown>;
      if (typeof entry.cardId !== "string" || entry.cardId.length > 32) return null;
      const v = entry.verdict;
      if (v !== "safe" && v !== "scam" && v !== "timeout") return null;
      parsed.push({ cardId: entry.cardId, verdict: v });
    }
    return {
      kind: "rapid",
      sectorId: body.sectorId,
      missionId: body.missionId,
      hintUsed,
      attempt,
      answers: parsed,
    };
  }

  if (body.kind === "censor") {
    const ids = body.maskedLineIds;
    if (!Array.isArray(ids) || ids.length > 200) return null;
    if (!ids.every((id) => typeof id === "string" && id.length <= 16)) return null;
    return {
      kind: "censor",
      sectorId: body.sectorId,
      missionId: body.missionId,
      maskedLineIds: [...new Set(ids as string[])],
      hintUsed,
      attempt,
    };
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "corpo inválido" }, { status: 400 });
  }

  const body = parseBody(raw);
  if (!body) return Response.json({ error: "corpo inválido" }, { status: 400 });

  const mission = getMission(body.sectorId, body.missionId);
  if (!mission) return Response.json({ error: "missão não encontrada" }, { status: 404 });

  // a partir da tentativa seguinte ao último escudo, o exercício vira guiado
  const guided = body.attempt > SHIELDS;
  const headers = { "Cache-Control": "no-store" };

  // ---------------- Missão de escolha ----------------
  if (body.kind === "choice") {
    if (mission.kind !== "phishing" && mission.kind !== "sms") {
      return Response.json({ error: "tipo de missão incompatível" }, { status: 409 });
    }

    const option = mission.options.find((o) => o.id === body.optionId);
    if (!option) return Response.json({ error: "opção inexistente" }, { status: 400 });

    const result: ValidationResponse = {
      correct: option.correct,
      message: option.feedback,
      xpAwarded: option.correct ? award(body.attempt, body.hintUsed) : 0,
      guided,
    };
    return Response.json(result, { headers });
  }

  // ---------------- Encontre os sinais ----------------
  if (body.kind === "spot") {
    if (mission.kind !== "spot") {
      return Response.json({ error: "tipo de missão incompatível" }, { status: 409 });
    }
    const flagged = new Set(body.flaggedIds);
    const truth = new Set(mission.flaggedIds);
    const breakdown = mission.lines.map((line) => {
      const isSignal = truth.has(line.id);
      const marked = flagged.has(line.id);
      const status: "hit" | "missed" | "false" | "ok" =
        isSignal && marked ? "hit" : isSignal ? "missed" : marked ? "false" : "ok";
      return { lineId: line.id, text: line.text, status, why: mission.explanations[line.id] };
    });
    const missed = breakdown.filter((b) => b.status === "missed").length;
    const falsePositives = breakdown.filter((b) => b.status === "false").length;
    const passed = missed === 0 && falsePositives === 0;
    // no Modo Guiado, revela os sinais para o colaborador concluir
    const visible = breakdown.filter((b) => b.status !== "ok") as ValidationResponse["spotBreakdown"];

    const result: ValidationResponse = {
      correct: passed,
      message: passed
        ? `Todos os ${truth.size} sinais encontrados, sem falso positivo. Você consegue apontar o golpe — e explicar para o colega.`
        : missed > 0 && falsePositives > 0
          ? `Faltaram ${missed} sinal(is) e ${falsePositives} linha(s) marcada(s) não eram indicador. Veja o porquê de cada uma abaixo.`
          : missed > 0
            ? `Faltou apontar ${missed} sinal(is). O golpe passa por onde ninguém olha — veja abaixo.`
            : `${falsePositives} linha(s) marcada(s) não são indicador. Marcar tudo esvazia o alerta.`,
      xpAwarded: passed ? award(body.attempt, body.hintUsed) : 0,
      guided,
      spotBreakdown: passed || guided ? visible : visible?.filter((b) => b.status !== "missed"),
      revealedLineIds: guided ? mission.flaggedIds : undefined,
    };
    return Response.json(result, { headers });
  }

  // ---------------- Ordem de resposta ----------------
  if (body.kind === "sequence") {
    if (mission.kind !== "sequence") {
      return Response.json({ error: "tipo de missão incompatível" }, { status: 409 });
    }
    const byId = new Map(mission.steps.map((step) => [step.id, step]));
    const breakdown = mission.steps.map((step, position) => {
      const playerId = body.orderedIds[position];
      const player = playerId ? byId.get(playerId) : undefined;
      return {
        position: position + 1,
        text: step.text,
        playerText: player?.text ?? "—",
        correct: playerId === step.id,
      };
    });
    const hits = breakdown.filter((b) => b.correct).length;
    const total = mission.steps.length;
    const passed = hits === total;

    const result: ValidationResponse = {
      correct: passed,
      message: passed
        ? `Sequência correta. ${mission.rationale}`
        : `${hits} de ${total} passos na posição certa. ${guided ? mission.rationale : "Compare a sua ordem com a esperada abaixo e tente de novo."}`,
      xpAwarded: passed ? award(body.attempt, body.hintUsed) : 0,
      guided,
      sequenceBreakdown: breakdown,
    };
    return Response.json(result, { headers });
  }

  // ---------------- Desafio Final ----------------
  if (body.kind === "quiz") {
    if (mission.kind !== "quiz") {
      return Response.json({ error: "tipo de missão incompatível" }, { status: 409 });
    }

    const chosen = new Map(body.answers.map((a) => [a.questionId, a.optionId]));
    const breakdown = mission.questions.map((question) => ({
      questionId: question.id,
      prompt: question.prompt,
      correct: chosen.get(question.id) === question.correctOptionId,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
    }));

    const hits = breakdown.filter((item) => item.correct).length;
    const total = mission.questions.length;
    const passed = hits >= mission.passingScore;
    const unanswered = mission.questions.filter((q) => !chosen.get(q.id)).length;

    if (passed) {
      const result: ValidationResponse = {
        correct: true,
        message:
          hits === total
            ? `Trilha concluída com ${hits}/${total}. Você fecha o ciclo sem nenhum ponto cego nos módulos anteriores.`
            : `Trilha concluída com ${hits}/${total}. Reveja a devolutiva abaixo antes do próximo ciclo.`,
        xpAwarded: award(body.attempt, body.hintUsed) + (hits === total ? 40 : 0),
        guided,
        quizBreakdown: breakdown,
      };
      return Response.json(result, { headers });
    }

    const timeNote =
      body.timedOut && unanswered > 0
        ? ` O tempo encerrou com ${unanswered} pergunta(s) em branco.`
        : "";

    const result: ValidationResponse = {
      correct: false,
      message: `Placar ${hits}/${total} — abaixo dos ${mission.passingScore} necessários.${timeNote} A devolutiva abaixo mostra o raciocínio de cada questão; você pode refazer a rodada.`,
      xpAwarded: 0,
      guided,
      quizBreakdown: breakdown,
    };
    return Response.json(result, { headers });
  }

  // ---------------- Rodada Rapid Fire ----------------

  if (body.kind === "rapid") {
    if (mission.kind !== "rapid") {
      return Response.json({ error: "tipo de missão incompatível" }, { status: 409 });
    }

    // O placar é recalculado do zero contra o baralho do servidor:
    // as respostas do cliente são entradas, não resultado.
    const deck = new Map(getCards(mission.cardIds).map((card) => [card.id, card]));
    let hits = 0;
    let timeouts = 0;
    const missedVectors: string[] = [];

    for (const answer of body.answers) {
      const card = deck.get(answer.cardId);
      if (!card) continue;
      if (answer.verdict === "timeout") {
        timeouts += 1;
        missedVectors.push(card.verdictLabel);
        continue;
      }
      if ((answer.verdict === "scam") === card.isScam) {
        hits += 1;
      } else {
        missedVectors.push(card.verdictLabel);
      }
    }

    const total = mission.cardIds.length;
    const passed = hits >= mission.passingScore;

    if (passed) {
      const perfect = hits === total;
      const result: ValidationResponse = {
        correct: true,
        message: perfect
          ? `Rodada perfeita: ${hits}/${total}. Você separou golpe de comunicação legítima sem gerar falso positivo — é exatamente o comportamento que mantém o canal de reporte confiável.`
          : `Rodada concluída: ${hits}/${total}. Reveja ${[...new Set(missedVectors)].join(", ")} na CyberPedia antes do próximo ciclo.`,
        xpAwarded: award(body.attempt, body.hintUsed) + (perfect ? 25 : 0),
        guided,
      };
      return Response.json(result, { headers });
    }

    const detail =
      timeouts > 0
        ? ` ${timeouts} card(s) estouraram o tempo — não decidir também é uma decisão, e na operação real ela é tomada por você de qualquer forma.`
        : "";

    const result: ValidationResponse = {
      correct: false,
      message: `Placar ${hits}/${total} — abaixo dos ${mission.passingScore} necessários.${detail} Vetores que passaram: ${[...new Set(missedVectors)].join(", ")}.`,
      xpAwarded: 0,
      guided,
      findings: [...new Set(missedVectors)],
    };
    return Response.json(result, { headers });
  }

  // ---------------- Missão de censura (DLP) ----------------
  if (mission.kind !== "censor") {
    return Response.json({ error: "tipo de missão incompatível" }, { status: 409 });
  }

  if (body.kind !== "censor") {
    return Response.json({ error: "tipo de missão incompatível" }, { status: 409 });
  }

  const verdict = judgeCensor(mission.prompt, body.maskedLineIds);

  if (verdict.correct) {
    const result: ValidationResponse = {
      correct: true,
      message: `Filtro aplicado corretamente. O motor identificou ${verdict.findings.join(", ")} e você mascarou exatamente esses itens.`,
      xpAwarded: award(body.attempt, body.hintUsed),
      guided,
      findings: verdict.findings,
    };
    return Response.json(result, { headers });
  }

  // Errou. No Modo Guiado o servidor para de esconder: aponta as linhas.
  if (guided) {
    const sensitive = scanLines(mission.prompt);
    const result: ValidationResponse = {
      correct: false,
      message: `Modo guiado ativado. As linhas de risco estão destacadas: ${sensitive
        .map((f) => f.labels.join(" e "))
        .join(", ")}. Marque exatamente essas e envie — o objetivo agora é fixar o padrão, não acertar de primeira.`,
      xpAwarded: 0,
      guided: true,
      revealedLineIds: sensitive.map((f) => f.lineId),
      findings: [...new Set(sensitive.flatMap((f) => f.labels))],
    };
    return Response.json(result, { headers });
  }

  let message: string;
  if (verdict.missed.length > 0) {
    const labels = [...new Set(verdict.missed.flatMap((f) => f.labels))].join(", ");
    message = `Vazamento. Passou sem máscara: ${labels}. Uma vez enviado, o dado está fora do perímetro e a credencial precisa ser rotacionada.`;
  } else {
    message =
      "Falso positivo. Você mascarou conteúdo que não é PII nem segredo — isso degrada o contexto e treina o time a ignorar o processo de DLP.";
  }

  const result: ValidationResponse = {
    correct: false,
    message,
    xpAwarded: 0,
    guided: false,
  };
  return Response.json(result, { headers });
}
