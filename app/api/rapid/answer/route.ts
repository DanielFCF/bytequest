import { getCard } from "@/lib/rapidfire";
import type { RapidAnswerResponse, RapidVerdict } from "@/lib/types";

/**
 * POST /api/rapid/answer — veredito de UM card do Rapid Fire.
 *
 * Só devolve feedback didático; não credita XP. A pontuação da rodada
 * é recalculada do zero em /api/missions/validate, para que um cliente
 * modificado não consiga inflar o resultado card a card.
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

  if (typeof body.cardId !== "string" || body.cardId.length > 32) {
    return Response.json({ error: "card inválido" }, { status: 400 });
  }
  const verdict = body.verdict;
  if (verdict !== "safe" && verdict !== "scam" && verdict !== "timeout") {
    return Response.json({ error: "veredito inválido" }, { status: 400 });
  }

  const card = getCard(body.cardId);
  if (!card) return Response.json({ error: "card não encontrado" }, { status: 404 });

  const chosen: RapidVerdict = verdict;
  const correct = chosen === "timeout" ? false : (chosen === "scam") === card.isScam;

  const result: RapidAnswerResponse = {
    correct,
    isScam: card.isScam,
    verdictLabel: card.verdictLabel,
    explanation:
      chosen === "timeout"
        ? `Tempo esgotado. ${card.explanation}`
        : card.explanation,
  };

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
