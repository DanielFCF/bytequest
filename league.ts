// ============================================================
// Liga de Cibersegurança — módulo PÚBLICO.
//
// Fica separado de lib/duel.ts de propósito: aquele arquivo contém o
// gabarito das perguntas e nunca pode ser importado pelo cliente.
// Aqui só há faixas, progressão e um quadro de líderes fictício —
// nada que um jogador possa usar para trapacear.
// ============================================================

export interface Tier {
  name: string;
  min: number;
  accent: "bronze" | "silver" | "gold" | "diamond";
}

export const TIERS: Tier[] = [
  { name: "Bronze III", min: 0, accent: "bronze" },
  { name: "Bronze II", min: 120, accent: "bronze" },
  { name: "Bronze I", min: 280, accent: "bronze" },
  { name: "Prata III", min: 480, accent: "silver" },
  { name: "Prata II", min: 720, accent: "silver" },
  { name: "Prata I", min: 1000, accent: "silver" },
  { name: "Ouro III", min: 1320, accent: "gold" },
  { name: "Ouro II", min: 1700, accent: "gold" },
  { name: "Ouro I", min: 2150, accent: "gold" },
  { name: "Diamante", min: 2700, accent: "diamond" },
];

export interface LeagueStatus {
  tier: Tier;
  next: Tier | null;
  /** 0–100 dentro da faixa atual */
  progress: number;
  /** pontos que faltam para subir */
  toNext: number;
}

export function tierFor(points: number): LeagueStatus {
  let tier = TIERS[0];
  for (const t of TIERS) if (points >= t.min) tier = t;
  const next = TIERS[TIERS.indexOf(tier) + 1] ?? null;
  const progress = next
    ? Math.round(((points - tier.min) / (next.min - tier.min)) * 100)
    : 100;
  return {
    tier,
    next,
    progress: Math.max(0, Math.min(100, progress)),
    toNext: next ? Math.max(0, next.min - points) : 0,
  };
}

/** Pontos de liga ganhos numa partida. Perder também soma — pouco. */
export function leagueDelta(
  score: number,
  result: "win" | "draw" | "loss",
): number {
  const base = Math.round(score / 6);
  const bonus = result === "win" ? 45 : result === "draw" ? 22 : 8;
  return base + bonus;
}

// ---------- Quadro de líderes fictício ----------

export interface LeaderRow {
  name: string;
  unit: string;
  points: number;
  you?: boolean;
}

/**
 * Colegas fictícios da liga. Serve para dar escala ao número de pontos
 * do jogador — não representa pessoas reais nem partidas ocorridas.
 */
const ROSTER: LeaderRow[] = [
  { name: "Beatriz L.", unit: "TI — Infraestrutura", points: 2840 },
  { name: "Ricardo N.", unit: "CD Extrema", points: 2410 },
  { name: "Camila P.", unit: "Matriz — Financeiro", points: 2075 },
  { name: "Juliana F.", unit: "Matriz — RH", points: 1690 },
  { name: "Rogério S.", unit: "CD Cajamar", points: 1355 },
  { name: "Thiago A.", unit: "SAC — Atendimento", points: 1120 },
  { name: "Marina D.", unit: "Loja 42 — Interlagos", points: 865 },
  { name: "Anderson M.", unit: "Loja 17 — Osasco", points: 540 },
  { name: "Fábio R.", unit: "Loja 08 — Tatuapé", points: 395 },
  { name: "Letícia M.", unit: "CD Jundiaí", points: 210 },
];

/** Total fictício de participantes, para a colocação global fazer sentido. */
export const LEAGUE_SIZE = 7543;

export interface LeaguePosition {
  rank: number;
  percentile: number;
  board: LeaderRow[];
}

/**
 * Posição do jogador no quadro. A colocação global é interpolada a
 * partir dos pontos: mais pontos, colocação melhor.
 */
export function positionFor(points: number, playerName: string): LeaguePosition {
  const you: LeaderRow = {
    name: playerName.trim() || "Você",
    unit: "sua sessão",
    points,
    you: true,
  };
  const all = [...ROSTER, you].sort((a, b) => b.points - a.points);
  const indexOfYou = all.findIndex((r) => r.you);

  const top = ROSTER[0].points;
  const share = Math.max(0, Math.min(1, points / (top * 1.15)));
  const rank = Math.max(1, Math.round(LEAGUE_SIZE * (1 - share)));
  const percentile = Math.max(1, Math.min(99, Math.round(share * 100)));

  // mostra a vizinhança do jogador, não o topo inalcançável
  const start = Math.max(0, Math.min(indexOfYou - 2, all.length - 5));
  return { rank, percentile, board: all.slice(start, start + 5) };
}
