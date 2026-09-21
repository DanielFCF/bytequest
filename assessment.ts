import { getTrack } from "./missions";
import { SECTORS } from "./sectors";
import type {
  AssessmentQuestion,
  ComposedModule,
  Mission,
  PublicAssessmentQuestion,
  RiskTag,
  SectorId,
  TrackPlanResponse,
} from "./types";
import { toPublicMission } from "./missions";

// ============================================================
// Diagnóstico e composição de trilha personalizada — SERVER ONLY.
//
// A escolha dos módulos é DETERMINÍSTICA e explicável de propósito.
// Num contexto de GRC alguém vai perguntar por que determinado
// colaborador recebeu determinado módulo, e a resposta precisa ser
// auditável e reproduzível: dois perfis idênticos recebem a mesma
// trilha, hoje e daqui a seis meses. Um modelo de linguagem decidindo
// o caminho pedagógico não sustenta essa pergunta.
//
// O papel de um LLM aqui seria gerar VARIAÇÕES de conteúdo sob revisão
// humana, nunca decidir a trilha.
// ============================================================

export const TAG_LABELS: Record<RiskTag, string> = {
  cliente: "Dados de cliente e PII",
  ia: "Uso de IA generativa",
  fisico: "Exposição física e presencial",
  financeiro: "Fraude financeira",
  acesso: "Credenciais e acesso",
  lideranca: "Autoridade e aprovação",
  tecnico: "Superfície técnica",
};

/**
 * Classificação dos 36 módulos por dimensão de risco.
 * Fica aqui, e não no catálogo, para manter a mudança aditiva:
 * lib/missions.ts segue intocado.
 */
const MISSION_TAGS: Record<string, RiskTag[]> = {
  // Lojas
  "lojas-spot-troca": ["financeiro", "fisico"],
  "lojas-seq-caixa": ["fisico", "tecnico"],
  "lojas-cupom-falso": ["financeiro", "cliente"],
  "lojas-wifi-falso": ["acesso", "fisico"],
  "lojas-shimming": ["financeiro", "fisico", "cliente"],
  "lojas-pix-qr": ["financeiro", "cliente", "fisico"],
  "rapid-lojas": ["cliente", "fisico"],
  "lojas-juice-jacking": ["fisico", "acesso"],
  "lojas-baiting": ["fisico", "acesso"],
  "lojas-dlp-cliente": ["cliente", "ia"],
  "quiz-lojas": ["fisico", "cliente"],
  // Logística
  "log-spot-romaneio": ["financeiro", "tecnico"],
  "log-seq-ransomware": ["tecnico", "fisico"],
  "log-motorista-app": ["financeiro", "fisico"],
  "log-descarte": ["cliente", "fisico"],
  "log-ransomware": ["acesso", "fisico"],
  "log-rota": ["financeiro", "fisico"],
  "rapid-logistica": ["financeiro", "fisico"],
  "log-tailgating": ["fisico", "acesso"],
  "log-qrcode": ["acesso", "fisico"],
  "log-dlp-manifesto": ["ia", "cliente", "tecnico"],
  "quiz-logistica": ["fisico", "financeiro"],
  // Matriz
  "matriz-spot-rh": ["acesso", "financeiro"],
  "matriz-seq-bec": ["financeiro", "acesso"],
  "matriz-teams-externo": ["acesso", "financeiro"],
  "matriz-impressora": ["cliente", "lideranca"],
  "matriz-fornecedor": ["financeiro", "acesso"],
  "matriz-whaling": ["financeiro", "lideranca"],
  "rapid-matriz": ["financeiro", "ia"],
  "matriz-shadow-ai": ["ia", "cliente"],
  "matriz-shadow-it": ["ia", "tecnico"],
  "matriz-dlp": ["ia", "cliente", "tecnico"],
  "quiz-matriz": ["ia", "financeiro"],
  // SAC
  "sac-spot-chat": ["cliente", "acesso"],
  "sac-seq-vazamento": ["cliente", "acesso"],
  "sac-recall-produto": ["cliente", "financeiro"],
  "sac-tela-compartilhada": ["acesso", "cliente"],
  "sac-helpdesk": ["acesso", "cliente"],
  "sac-ato": ["cliente", "financeiro"],
  "sac-identidade": ["cliente", "acesso"],
  "rapid-sac": ["acesso", "cliente"],
  "sac-vishing": ["acesso"],
  "sac-dlp-transcricao": ["cliente", "ia"],
  "sac-typosquatting": ["cliente", "financeiro"],
  "quiz-sac": ["cliente", "acesso"],
  // TI
  "ti-spot-pr": ["tecnico", "ia"],
  "ti-seq-credencial": ["tecnico", "acesso"],
  "ti-mfa-reset": ["acesso", "lideranca"],
  "ti-extensao": ["tecnico", "ia"],
  "ti-magecart": ["tecnico", "cliente", "financeiro"],
  "ti-edge": ["acesso", "tecnico"],
  "ti-secret-leakage": ["tecnico", "ia", "acesso"],
  "rapid-ti": ["tecnico", "acesso"],
  "ti-prompt-injection": ["ia", "tecnico"],
  "ti-cloud-misconfig": ["tecnico", "acesso"],
  "ti-supply-chain": ["tecnico", "ia"],
  "quiz-ti": ["tecnico", "ia"],
  // Liderança
  "lid-spot-jornalista": ["lideranca", "tecnico"],
  "lid-seq-crise": ["lideranca", "cliente"],
  "lid-viagem-post": ["lideranca", "financeiro"],
  "lid-fornecedor-terceiro": ["lideranca", "acesso"],
  "lid-resgate": ["lideranca", "financeiro"],
  "lid-alvo": ["lideranca", "financeiro"],
  "rapid-lideranca": ["lideranca", "financeiro"],
  "lid-deepfake": ["lideranca", "financeiro", "acesso"],
  "lid-excecao": ["lideranca", "acesso"],
  "lid-dlp-estrategico": ["lideranca", "ia"],
  "quiz-lideranca": ["lideranca", "financeiro"],
};

// ---------------- Questionário ----------------

export const QUESTIONS: AssessmentQuestion[] = [
  {
    id: "d1",
    prompt: "Onde você passa a maior parte do expediente?",
    help: "Define o contexto físico das ameaças que você encontra.",
    options: [
      {
        id: "loja",
        label: "Na loja, em contato com o público",
        weights: { fisico: 3, cliente: 2 },
        sectorAffinity: { lojas: 3, sac: 1 },
        rationale: "você trabalha em contato direto com o público",
      },
      {
        id: "cd",
        label: "Em centro de distribuição ou expedição",
        weights: { fisico: 3, financeiro: 1 },
        sectorAffinity: { logistica: 3 },
        rationale: "sua rotina é de centro de distribuição",
      },
      {
        id: "escritorio",
        label: "Em escritório, com e-mail e planilhas",
        weights: { financeiro: 2, ia: 2 },
        sectorAffinity: { matriz: 3 },
        rationale: "seu dia gira em torno de e-mail e planilhas",
      },
      {
        id: "atendimento",
        label: "Em atendimento remoto ao cliente",
        weights: { cliente: 3, acesso: 2 },
        sectorAffinity: { sac: 3 },
        rationale: "você atende clientes remotamente",
      },
    ],
  },
  {
    id: "d2",
    prompt: "Você lida com dados pessoais de clientes ou colaboradores?",
    help: "CPF, endereço, cartão, remuneração.",
    options: [
      {
        id: "sim-diario",
        label: "Sim, todos os dias",
        weights: { cliente: 4 },
        rationale: "você trata dado pessoal diariamente",
      },
      {
        id: "as-vezes",
        label: "Ocasionalmente",
        weights: { cliente: 2 },
        rationale: "você trata dado pessoal ocasionalmente",
      },
      {
        id: "nao",
        label: "Praticamente nunca",
        weights: {},
        rationale: "você raramente trata dado pessoal",
      },
    ],
  },
  {
    id: "d3",
    prompt: "Com que frequência usa IA generativa no trabalho?",
    help: "ChatGPT, Copilot, Gemini ou similares.",
    options: [
      {
        id: "sempre",
        label: "Uso todo dia, inclusive com dados de trabalho",
        weights: { ia: 4, cliente: 1 },
        sectorAffinity: { matriz: 1, ti: 1 },
        rationale: "você usa IA generativa diariamente com dados de trabalho",
      },
      {
        id: "as-vezes",
        label: "De vez em quando, para texto e ideias",
        weights: { ia: 2 },
        rationale: "você usa IA generativa eventualmente",
      },
      {
        id: "nunca",
        label: "Não uso",
        weights: {},
        rationale: "você não usa IA generativa no trabalho",
      },
    ],
  },
  {
    id: "d4",
    prompt: "Você tem acesso privilegiado a sistemas críticos?",
    help: "Administração, servidores, código, aprovação de pagamento.",
    options: [
      {
        id: "tecnico",
        label: "Sim — infraestrutura, código ou banco de dados",
        weights: { tecnico: 4, acesso: 3, ia: 1 },
        sectorAffinity: { ti: 4 },
        rationale: "você tem acesso privilegiado a sistemas técnicos",
      },
      {
        id: "financeiro",
        label: "Sim — aprovação de pagamento ou cadastro de fornecedor",
        weights: { financeiro: 4, acesso: 2 },
        sectorAffinity: { matriz: 2 },
        rationale: "você aprova pagamento ou altera cadastro de fornecedor",
      },
      {
        id: "operacional",
        label: "Apenas os sistemas da minha operação",
        weights: { acesso: 1 },
        rationale: "seu acesso se limita aos sistemas da operação",
      },
    ],
  },
  {
    id: "d5",
    prompt: "Você lidera pessoas ou aprova exceções de processo?",
    options: [
      {
        id: "sim",
        label: "Sim, tenho equipe ou alçada de aprovação",
        weights: { lideranca: 4, financeiro: 2 },
        sectorAffinity: { lideranca: 9 },
        rationale: "você tem equipe ou alçada de aprovação",
      },
      {
        id: "parcial",
        label: "Substituo a liderança eventualmente",
        weights: { lideranca: 2 },
        sectorAffinity: { lideranca: 1 },
        rationale: "você assume a liderança eventualmente",
      },
      {
        id: "nao",
        label: "Não",
        weights: {},
        rationale: "você não tem alçada de aprovação",
      },
    ],
  },  {
    id: "d6",
    prompt: "Como chegam até você os pedidos de gente de fora da empresa?",
    help: "Fornecedor, cliente, prestador, entregador.",
    options: [
      {
        id: "telefone",
        label: "Telefone ou WhatsApp, na maior parte das vezes",
        weights: { acesso: 3, cliente: 2 },
        sectorAffinity: { sac: 2, lojas: 1 },
        rationale: "a maior parte dos pedidos externos chega por voz ou mensagem",
      },
      {
        id: "email",
        label: "Por e-mail, com documentos anexados",
        weights: { financeiro: 3, ia: 1 },
        sectorAffinity: { matriz: 2, logistica: 1 },
        rationale: "você recebe pedidos externos por e-mail com anexos",
      },
      {
        id: "presencial",
        label: "Pessoalmente, no balcão ou na portaria",
        weights: { fisico: 4 },
        sectorAffinity: { lojas: 2, logistica: 2 },
        rationale: "você recebe gente de fora presencialmente",
      },
      {
        id: "sistema",
        label: "Só pelo sistema, com chamado aberto",
        weights: { tecnico: 2, acesso: 1 },
        sectorAffinity: { ti: 2 },
        rationale: "seus pedidos externos passam por sistema com chamado",
      },
    ],
  },
  {
    id: "d7",
    prompt: "Qual sua familiaridade com segurança da informação?",
    help: "Não existe resposta errada — isso calibra a profundidade da trilha.",
    options: [
      {
        id: "nenhuma",
        label: "Nunca fiz treinamento na área",
        weights: {},
        rationale: "esta é a sua primeira trilha de segurança",
      },
      {
        id: "basica",
        label: "Já fiz treinamentos, conheço o básico",
        weights: { acesso: 1 },
        rationale: "você já tem base em segurança",
      },
      {
        id: "avancada",
        label: "Trabalho perto do tema ou já tratei incidentes",
        weights: { tecnico: 3, ia: 1 },
        sectorAffinity: { ti: 3 },
        rationale: "você já trata incidentes ou trabalha perto do tema",
      },
    ],
  },

];

/** Projeção pública: pesos e afinidades não precisam ir ao cliente. */
export function publicQuestions(): PublicAssessmentQuestion[] {
  return QUESTIONS.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    help: q.help,
    options: q.options.map((o) => ({ id: o.id, label: o.label })),
  }));
}

// ---------------- Composição ----------------

interface Indexed {
  mission: Mission;
  sector: SectorId;
  sectorLabel: string;
}

function indexCatalog(): Indexed[] {
  const out: Indexed[] = [];
  for (const sector of SECTORS) {
    for (const mission of getTrack(sector.id)) {
      out.push({ mission, sector: sector.id, sectorLabel: sector.label });
    }
  }
  return out;
}

export function composeTrack(
  answers: Array<{ questionId: string; optionId: string }>,
): TrackPlanResponse | null {
  const profile: Partial<Record<RiskTag, number>> = {};
  const affinity: Partial<Record<SectorId, number>> = {};
  // guarda, por dimensão, a resposta que mais contribuiu — vira a justificativa
  const rationaleByTag: Partial<Record<RiskTag, { text: string; weight: number }>> = {};

  for (const answer of answers) {
    const question = QUESTIONS.find((q) => q.id === answer.questionId);
    const option = question?.options.find((o) => o.id === answer.optionId);
    if (!option) return null;

    for (const [tag, weight] of Object.entries(option.weights) as Array<[RiskTag, number]>) {
      profile[tag] = (profile[tag] ?? 0) + weight;
      const current = rationaleByTag[tag];
      if (!current || weight > current.weight) {
        rationaleByTag[tag] = { text: option.rationale, weight };
      }
    }
    for (const [sector, weight] of Object.entries(option.sectorAffinity ?? {}) as Array<
      [SectorId, number]
    >) {
      affinity[sector] = (affinity[sector] ?? 0) + weight;
    }
  }

  const catalog = indexCatalog();

  const baseSector =
    (Object.entries(affinity).sort((a, b) => b[1] - a[1])[0]?.[0] as SectorId | undefined) ??
    "lojas";
  const baseSectorLabel = SECTORS.find((s) => s.id === baseSector)?.label ?? "Lojas";

  const scoreOf = (item: Indexed) => {
    const tags = MISSION_TAGS[item.mission.id] ?? [];
    let score = 0;
    const ranked: Array<{ tag: RiskTag; value: number }> = [];

    tags.forEach((tag, position) => {
      // a primeira tag é a dominante do módulo; as seguintes pesam menos
      const value = (profile[tag] ?? 0) * (position === 0 ? 1 : 0.6);
      score += value;
      ranked.push({ tag, value });
    });
    ranked.sort((a, b) => b.value - a.value);

    // Bônus de contexto: entre dois módulos de peso parecido, vence o da
    // trilha do próprio colaborador. Sem isso a trilha fica temática
    // demais e perde o cenário reconhecível do dia a dia dele.
    if (item.sector === baseSector) score += 4;

    return { score, ranked };
  };

  const used = new Set<string>();
  // Justificativas já exibidas: se a mesma dimensão domina a trilha
  // inteira, o usuário lê "porque você trata dado pessoal" seis vezes
  // e a explicação perde valor. Aqui a segunda dimensão assume.
  const usedReasons = new Set<string>();

  const pick = (predicate: (item: Indexed) => boolean): ComposedModule | null => {
    const ranked = catalog
      .filter((item) => !used.has(item.mission.id) && predicate(item))
      .map((item) => ({ item, ...scoreOf(item) }))
      .sort((a, b) => b.score - a.score || a.item.mission.id.localeCompare(b.item.mission.id));

    const winner = ranked[0];
    if (!winner) return null;
    used.add(winner.item.mission.id);

    const candidates = winner.ranked.filter((entry) => entry.value > 0);
    const fresh = candidates.find(
      (entry) => rationaleByTag[entry.tag] && !usedReasons.has(rationaleByTag[entry.tag]!.text),
    );
    const chosen = fresh ?? candidates[0];
    const rationale = chosen ? rationaleByTag[chosen.tag] : undefined;

    if (rationale) usedReasons.add(rationale.text);

    const reason = rationale
      ? `Selecionado porque ${rationale.text}.`
      : `Compõe a espinha da trilha ${winner.item.sectorLabel}.`;

    return {
      mission: toPublicMission(winner.item.mission),
      sourceSector: winner.item.sector,
      sourceLabel: winner.item.sectorLabel,
      reason,
    };
  };

  // A espinha pedagógica é fixa; o que muda é o recheio. Isso preserva
  // o desenho de aprendizagem (cenário antes, reflexo depois,
  // consolidação no fim) mesmo com módulos vindos de trilhas distintas.
  // A trilha personalizada tem o MESMO tamanho das trilhas prontas:
  // 10 módulos, com a mesma espinha pedagógica (cenário, reflexo,
  // leitura de indicadores, DLP, resposta a incidente, consolidação).
  // Só o recheio muda conforme o perfil.
  const isScenario = (item: Indexed) =>
    item.mission.kind === "phishing" || item.mission.kind === "sms";

  const modules = [
    pick(isScenario),
    pick((item) => item.mission.kind === "rapid" && item.sector === baseSector) ??
      pick((item) => item.mission.kind === "rapid"),
    pick(isScenario),
    pick((item) => item.mission.kind === "censor"),
    pick((item) => item.mission.kind === "spot" && item.sector === baseSector) ??
      pick((item) => item.mission.kind === "spot"),
    pick(isScenario),
    pick((item) => item.mission.kind === "sequence" && item.sector === baseSector) ??
      pick((item) => item.mission.kind === "sequence"),
    pick(isScenario),
    pick((item) => item.mission.kind === "censor") ?? pick(isScenario),
    pick((item) => item.mission.kind === "quiz" && item.sector === baseSector) ??
      pick((item) => item.mission.kind === "quiz"),
  ].filter((module): module is ComposedModule => module !== null);

  return {
    modules,
    profile: (Object.entries(profile) as Array<[RiskTag, number]>)
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, score]) => ({ tag, label: TAG_LABELS[tag], score })),
    baseSector,
    baseSectorLabel,
  };
}
