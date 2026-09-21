import { botMove, questionsFor, scoreFor, standingFor, SECONDS_PER_QUESTION } from "@/lib/duel";

/**
 * POST /api/duelo/answer — resolve uma pergunta da partida.
 *
 * O placar acumulado é recalculado do zero a cada chamada, a partir
 * das respostas enviadas: o cliente informa o que respondeu, nunca
 * quanto valeu.
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
  const body = raw as Record<string, unknown>;

  const matchId = body.matchId;
  if (typeof matchId !== "string" || matchId.length > 40) {
    return Response.json({ error: "partida inválida" }, { status: 400 });
  }
  const previousPoints =
    typeof body.leaguePoints === "number" && Number.isFinite(body.leaguePoints)
      ? Math.min(Math.max(Math.round(body.leaguePoints), 0), 500000)
      : 0;
  const playerName = typeof body.playerName === "string" ? body.playerName.slice(0, 40) : "Você";

  const answers = body.answers;
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > 20) {
    return Response.json({ error: "respostas inválidas" }, { status: 400 });
  }

  const parsed: Array<{ optionId: string | null; ms: number }> = [];
  for (const item of answers) {
    if (typeof item !== "object" || item === null) {
      return Response.json({ error: "respostas inválidas" }, { status: 400 });
    }
    const entry = item as Record<string, unknown>;
    const opt = entry.optionId;
    if (opt !== null && (typeof opt !== "string" || opt.length > 8)) {
      return Response.json({ error: "respostas inválidas" }, { status: 400 });
    }
    const ms = typeof entry.ms === "number" && Number.isFinite(entry.ms) ? entry.ms : SECONDS_PER_QUESTION * 1000;
    parsed.push({ optionId: opt, ms: Math.min(Math.max(ms, 0), SECONDS_PER_QUESTION * 1000) });
  }

  const questions = questionsFor(matchId);
  if (parsed.length > questions.length) {
    return Response.json({ error: "respostas inválidas" }, { status: 400 });
  }

  let you = 0;
  let opp = 0;
  let youHits = 0;
  let oppHits = 0;

  parsed.forEach((answer, index) => {
    const question = questions[index];
    const hit = answer.optionId === question.correctOptionId;
    if (hit) youHits += 1;
    you += scoreFor(hit, answer.ms);

    const bot = botMove(matchId, index, question);
    if (bot.correct) oppHits += 1;
    opp += scoreFor(bot.correct, bot.ms);
  });

  const index = parsed.length - 1;
  const question = questions[index];
  const bot = botMove(matchId, index, question);
  const finished = parsed.length === questions.length;

  return Response.json(
    {
      correct: parsed[index].optionId === question.correctOptionId,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      // verbete que responde esta pergunta — usado na devolutiva
      article: question.article,
      bot: { correct: bot.correct, optionId: bot.optionId, ms: bot.ms },
      scores: { you, opponent: opp },
      hits: { you: youHits, opponent: oppHits },
      finished,
      // XP só é creditado no fim, e é calculado aqui — nunca enviado pelo cliente
      xpAwarded: finished ? (you > opp ? 200 : you === opp ? 120 : 60) + youHits * 10 : 0,
      result: finished ? (you > opp ? "win" : you === opp ? "draw" : "loss") : null,
      // só o que o jogador errou entra na lista de revisão
      review: finished
        ? [
            ...new Set(
              questions
                .filter((q, i) => parsed[i]?.optionId !== q.correctOptionId)
                .map((q) => q.article),
            ),
          ]
        : [],
      standing: finished
        ? standingFor(
            previousPoints,
            you,
            youHits,
            questions.length,
            you > opp ? "win" : you === opp ? "draw" : "loss",
            playerName,
          )
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
