import {
  newMatchId, opponentFor, questionsFor, toPublicQuestion,
  QUESTIONS_PER_MATCH, SECONDS_PER_QUESTION,
} from "@/lib/duel";

/**
 * GET /api/duelo — abre uma partida.
 *
 * Devolve o oponente (simulado) e as perguntas SEM gabarito. O
 * comportamento do bot é derivado do matchId no servidor: o cliente
 * não recebe nada que permita prever ou manipular o resultado.
 */
export function GET(): Response {
  const matchId = newMatchId();
  return Response.json(
    {
      matchId,
      // skill do bot fica no servidor: só descrição vai ao cliente
      opponent: (({ name, handle, tier, unit, rating, avatar }) => ({
        name, handle, tier, unit, rating, avatar,
      }))(opponentFor(matchId)),
      questions: questionsFor(matchId).map(toPublicQuestion),
      secondsPerQuestion: SECONDS_PER_QUESTION,
      total: QUESTIONS_PER_MATCH,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
