import { composeTrack, publicQuestions } from "@/lib/assessment";

/** GET /api/trilha — devolve o questionário de diagnóstico. */
export function GET(): Response {
  return Response.json(
    { questions: publicQuestions() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST /api/trilha — monta a trilha personalizada a partir das respostas.
 *
 * A composição roda no servidor por dois motivos: o gabarito das missões
 * continua fora do navegador, e a regra de seleção fica auditável num
 * único lugar — requisito para responder "por que este colaborador
 * recebeu este módulo?".
 */
export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "corpo inválido" }, { status: 400 });
  }

  if (typeof raw !== "object" || raw === null) {
    return Response.json({ error: "corpo inválido" }, { status: 400 });
  }
  const answers = (raw as Record<string, unknown>).answers;
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > 20) {
    return Response.json({ error: "respostas inválidas" }, { status: 400 });
  }

  const parsed: Array<{ questionId: string; optionId: string }> = [];
  for (const item of answers) {
    if (typeof item !== "object" || item === null) {
      return Response.json({ error: "respostas inválidas" }, { status: 400 });
    }
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.questionId !== "string" ||
      entry.questionId.length > 16 ||
      typeof entry.optionId !== "string" ||
      entry.optionId.length > 16
    ) {
      return Response.json({ error: "respostas inválidas" }, { status: 400 });
    }
    parsed.push({ questionId: entry.questionId, optionId: entry.optionId });
  }

  const plan = composeTrack(parsed);
  if (!plan) return Response.json({ error: "resposta desconhecida" }, { status: 400 });

  return Response.json(plan, { headers: { "Cache-Control": "no-store" } });
}
