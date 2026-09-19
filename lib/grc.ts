import { getTrack } from "./missions";
import { SECTORS } from "./sectors";
import type {
  GrcSnapshot,
  RecommendedAction,
  RiskLevel,
  SectorRisk,
  ThreatEvent,
} from "./types";

// ============================================================
// Painel CISO / SOC — telemetria SIMULADA.
//
// Os números são gerados por um PRNG com semente fixa: mudam por
// setor mas não mudam a cada reload, então a demo é estável e o
// mesmo gráfico é reproduzível na apresentação.
//
// Na versão com backend real, esta função é substituída por uma
// consulta agregada ao banco de tentativas + ingestão dos alertas
// reais do SOC. O formato de saída não muda.
// ============================================================

/** PRNG determinístico (mulberry32) — mesma semente, mesmo resultado. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 75) return "critico";
  if (score >= 55) return "alto";
  if (score >= 35) return "medio";
  return "baixo";
}

/** Headcount por setor — proporção plausível para uma rede de varejo. */
const HEADCOUNT: Record<string, number> = {
  lojas: 4820,
  logistica: 1140,
  matriz: 860,
  sac: 410,
  ti: 265,
  lideranca: 48,
};

/** Perfil de exposição por setor: quanto o contexto de trabalho favorece o ataque. */
const EXPOSURE: Record<string, number> = {
  lojas: 0.82,
  logistica: 0.64,
  matriz: 0.55,
  sac: 0.71,
  ti: 0.3,
  lideranca: 0.68,
};

function buildSectors(): SectorRisk[] {
  return SECTORS.map((sector) => {
    const rand = seeded(hash(`risk:${sector.id}`));
    const exposure = EXPOSURE[sector.id] ?? 0.5;

    const coverage = Math.round(58 + rand() * 38);
    const resilience = Math.round(100 - exposure * 42 - rand() * 12);
    // risco combina exposição do contexto, falha nas simulações e cobertura baixa
    const riskScore = Math.round(
      Math.min(98, exposure * 55 + (100 - resilience) * 0.45 + (100 - coverage) * 0.25),
    );

    // vetor com mais falhas: puxado das missões reais da trilha do setor
    const track = getTrack(sector.id);
    // Só cenários de ameaça descrevem um vetor. Rapid Fire e Desafio
    // Final são formatos de treino: "Desafio Final — Lojas" apareceria
    // no painel como se fosse um vetor de ataque, o que não é.
    const scenarios = track.filter((m) => m.kind !== "rapid" && m.kind !== "quiz" && m.kind !== "sequence");
    const topVector =
      scenarios[Math.floor(rand() * scenarios.length)]?.title ?? "Phishing";
    const trendRoll = rand();

    const trend: SectorRisk["trend"] =
      trendRoll > 0.62 ? "down" : trendRoll > 0.3 ? "flat" : "up";

    return {
      sectorId: sector.id,
      label: sector.label,
      level: levelFromScore(riskScore),
      riskScore,
      coverage,
      resilience,
      headcount: HEADCOUNT[sector.id] ?? 100,
      topVector,
      trend,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

function buildFeed(sectors: SectorRisk[]): ThreatEvent[] {
  const events: ThreatEvent[] = [];
  const notes = [
    "Campanha reincidente: mesma isca aplicada em duas unidades diferentes.",
    "Falhas concentradas no turno da noite, quando não há liderança presente.",
    "Taxa de reporte subiu após a pílula de conhecimento do módulo.",
    "Nenhum colaborador reportou pelo canal oficial antes de interagir.",
    "Reincidência de quem já havia falhado no ciclo anterior — entrou na fila de revisão.",
    "Detecção manual chegou ao SOC antes do alerta automatizado.",
  ];

  let index = 0;
  for (const sector of sectors) {
    const track = getTrack(sector.sectorId);
    const rand = seeded(hash(`feed:${sector.sectorId}`));
    // setores mais expostos geram mais eventos no período
    const count = sector.riskScore >= 55 ? 2 : 1;

    for (let i = 0; i < count; i += 1) {
      const pool = track.filter((m) => m.kind !== "rapid" && m.kind !== "quiz" && m.kind !== "sequence");
      const mission = pool[Math.floor(rand() * pool.length)];
      const simulated = Math.round(sector.headcount * (0.25 + rand() * 0.4));
      const failRate = (100 - sector.resilience) / 100;
      const failed = Math.max(1, Math.round(simulated * failRate * (0.6 + rand() * 0.7)));

      events.push({
        id: `ev-${index}`,
        daysAgo: Math.floor(rand() * 7),
        vector: mission?.title ?? "Phishing genérico",
        sectorLabel: sector.label,
        severity: levelFromScore(Math.round(failRate * 100 + rand() * 20)),
        simulated,
        failed,
        note: notes[index % notes.length],
      });
      index += 1;
    }
  }

  return events.sort((a, b) => a.daysAgo - b.daysAgo || b.failed - a.failed);
}

/**
 * Série histórica de 6 semanas por setor — alimenta o gráfico de
 * tendência. Determinística, como o resto do snapshot.
 */
function buildHistory(sectors: SectorRisk[]): Record<string, number[]> {
  const history: Record<string, number[]> = {};
  for (const sector of sectors) {
    const rand = seeded(hash(`hist:${sector.sectorId}`));
    const series: number[] = [];
    let value = sector.riskScore + Math.round(rand() * 14) - 4;
    for (let week = 0; week < 5; week += 1) {
      value = Math.max(8, Math.min(98, value + Math.round((rand() - 0.5) * 12)));
      series.push(value);
    }
    series.push(sector.riskScore); // semana atual = índice vigente
    history[sector.sectorId] = series;
  }
  return history;
}

/**
 * Ações recomendadas — o que a liderança faz com o dado.
 * Derivadas do próprio ranking de risco, não escritas à mão: se a
 * ordem dos setores mudar, a recomendação acompanha.
 */
function buildActions(sectors: SectorRisk[]): RecommendedAction[] {
  const worst = sectors[0];
  const lowestCoverage = [...sectors].sort((a, b) => a.coverage - b.coverage)[0];
  const lowestResilience = [...sectors].sort((a, b) => a.resilience - b.resilience)[0];

  return [
    {
      id: "act-1",
      priority: "alta",
      title: `Campanha dirigida em ${worst.label}`,
      detail: `Maior índice de risco da rede (${worst.riskScore}/100), com concentração em ${worst.topVector}. Reforçar o módulo correspondente e repetir a simulação em 15 dias.`,
      owner: "Segurança da Informação",
      due: "15 dias",
    },
    {
      id: "act-2",
      priority: "alta",
      title: "Verificação out-of-band no service desk",
      detail:
        "Exigir confirmação por contato previamente cadastrado para toda redefinição de senha e reinscrição de MFA, com registro auditável. É o vetor de acesso inicial mais explorado contra o varejo.",
      owner: "TI / Service Desk",
      due: "30 dias",
    },
    {
      id: "act-3",
      priority: "media",
      title: `Fechar cobertura em ${lowestCoverage.label}`,
      detail: `Apenas ${lowestCoverage.coverage}% da unidade concluiu o ciclo. Alinhar com a liderança local janela de 15 minutos por turno.`,
      owner: "RH / Gestão da unidade",
      due: "45 dias",
    },
    {
      id: "act-4",
      priority: "media",
      title: `Revisão de conteúdo para ${lowestResilience.label}`,
      detail: `Resiliência de ${lowestResilience.resilience}% indica que o material atual não está sendo absorvido. Revisar linguagem e exemplos com colaboradores da própria unidade.`,
      owner: "Segurança + Comunicação",
      due: "60 dias",
    },
  ];
}

export function buildSnapshot(): GrcSnapshot {
  const sectors = buildSectors();
  const feed = buildFeed(sectors);

  const totalHeadcount = sectors.reduce((sum, s) => sum + s.headcount, 0);
  // resiliência ponderada por headcount — média simples esconderia o peso das Lojas
  const humanResilience = Math.round(
    sectors.reduce((sum, s) => sum + s.resilience * s.headcount, 0) / totalHeadcount,
  );
  const trainingCoverage = Math.round(
    sectors.reduce((sum, s) => sum + s.coverage * s.headcount, 0) / totalHeadcount,
  );
  const mitigatedIncidents = feed.reduce((sum, e) => sum + (e.simulated - e.failed), 0);

  const history = buildHistory(sectors);
  const actions = buildActions(sectors);

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 7,
    history,
    actions,
    benchmarks: [
      {
        label: "Violações que envolveram ransomware",
        ours: `${Math.max(12, 44 - Math.round(humanResilience / 5))}%`,
        market: "44%",
        source: "Verizon DBIR 2025",
      },
      {
        label: "Tráfego de robôs em sites de varejo",
        ours: "—",
        market: "39%",
        source: "Imperva Bad Bot Report 2025",
      },
      {
        label: "Empresas de varejo que sofreram ataque no último ano",
        ours: "—",
        market: "80%",
        source: "VikingCloud Retail Cyber Threat Survey",
      },
    ],
    kpis: {
      humanResilience,
      resilienceDelta: 6,
      mitigatedIncidents,
      reportRateMinutes: 14,
      trainingCoverage,
      activeEmployees: totalHeadcount,
    },
    sectors,
    feed,
  };
}
