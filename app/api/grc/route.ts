import { buildSnapshot } from "@/lib/grc";

/**
 * GET /api/grc — telemetria agregada para o painel CISO / SOC.
 *
 * Devolve SEMPRE dados agregados por unidade de negócio. Nenhum
 * identificador individual sai daqui: o painel mede a resiliência
 * da organização, não expõe quem errou. Essa separação é requisito
 * de aceitação do treinamento pelo corpo de colaboradores.
 */
export function GET(): Response {
  return Response.json(buildSnapshot(), { headers: { "Cache-Control": "no-store" } });
}
