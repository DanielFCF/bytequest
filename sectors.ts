import type { Sector, SectorId } from "./types";

/**
 * Dados de setor são públicos — ficam separados de `lib/missions.ts`
 * de propósito. Se o client importasse do mesmo módulo do catálogo,
 * o gabarito das missões entraria no bundle do navegador.
 */
export const SECTORS: Sector[] = [
  { id: "lojas", label: "Lojas", tag: "Frente de caixa & atendimento", icon: "ShoppingBag" },
  { id: "logistica", label: "Logística", tag: "Centros de distribuição", icon: "Truck" },
  { id: "matriz", label: "Matriz", tag: "RH, Financeiro & Marketing", icon: "Building2" },
  { id: "sac", label: "SAC", tag: "Atendimento ao cliente", icon: "Headset" },
  { id: "ti", label: "TI", tag: "Trilha avançada — Hard", icon: "Server" },
  { id: "lideranca", label: "Liderança", tag: "C-Level & diretoria", icon: "Crown" },
];

export const SECTOR_IDS: SectorId[] = SECTORS.map((s) => s.id);

export function isSectorId(value: unknown): value is SectorId {
  return typeof value === "string" && (SECTOR_IDS as string[]).includes(value);
}

export function findSector(id: SectorId | null): Sector | null {
  return SECTORS.find((s) => s.id === id) ?? null;
}
