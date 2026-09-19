import { getTrack, isSectorId, toPublicMission } from "@/lib/missions";
import type { TrackResponse } from "@/lib/types";

/**
 * GET /api/missions?sector=lojas
 *
 * Devolve a trilha completa do setor já sem gabarito. O mapa de
 * progressão precisa dos títulos e módulos de todas as missões;
 * a resposta correta de cada uma fica no servidor.
 */
export function GET(request: Request): Response {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector");

  if (!isSectorId(sector)) {
    return Response.json({ error: "setor inválido" }, { status: 400 });
  }

  const payload: TrackResponse = {
    sectorId: sector,
    missions: getTrack(sector).map(toPublicMission),
  };

  // Conteúdo por usuário: nada de cache compartilhado.
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
