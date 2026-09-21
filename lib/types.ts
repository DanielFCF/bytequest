// ============================================================
// ByteQuest — contratos de domínio
// Regra deste arquivo: tudo com sufixo `Public` pode ir para o
// navegador. O resto NUNCA sai do servidor.
// ============================================================

export type SectorId = "lojas" | "logistica" | "matriz" | "ti" | "sac" | "lideranca";

export type MissionKind = "phishing" | "sms" | "censor" | "rapid" | "quiz" | "spot" | "sequence";

export type SectorIconName =
  | "ShoppingBag"
  | "Truck"
  | "Building2"
  | "Server"
  | "Headset"
  | "Crown";

export interface Sector {
  id: SectorId;
  label: string;
  tag: string;
  /** nome do ícone lucide — dados não carregam componentes React */
  icon: SectorIconName;
}

export interface Briefing {
  theory: string;
  keyPoint: string;
}

interface MissionBase {
  id: string;
  day: number;
  /** tema do módulo, SEM número — a numeração vem da posição na trilha */
  theme: string;
  title: string;
  briefing: Briefing;
  hint: string;
}

// ---------- Missões de escolha (phishing / smishing) ----------

/** Opção completa — contém o gabarito. Server-only. */
export interface ChoiceOption {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
}

export interface ChoiceMission extends MissionBase {
  kind: "phishing" | "sms";
  message: { sender: string; subject: string; body: string };
  options: ChoiceOption[];
}

// ---------- Missão de censura / DLP ----------

export interface PromptLine {
  id: string;
  text: string;
}

export interface CensorMission extends MissionBase {
  kind: "censor";
  /**
   * O trecho NÃO carrega flag `isSensitive`. A classificação é derivada
   * no servidor pelo motor de regex (lib/dlp.ts): o cliente não sabe
   * qual linha é sensível.
   */
  prompt: PromptLine[];
}

// ---------- Missão Rapid Fire ----------

/** Card do baralho — `isScam` e `explanation` são SERVER ONLY. */
export interface RapidCard {
  id: string;
  channel: "sms" | "email" | "chat" | "push";
  sender: string;
  subject: string;
  body: string;
  isScam: boolean;
  /** rótulo curto do vetor (ou "Legítimo") mostrado no feedback */
  verdictLabel: string;
  explanation: string;
}

export interface PublicRapidCard {
  id: string;
  channel: RapidCard["channel"];
  sender: string;
  subject: string;
  body: string;
}

export interface RapidMission extends MissionBase {
  kind: "rapid";
  /** ids do baralho, resolvidos no servidor */
  cardIds: string[];
  /** segundos por card antes de perder um coração */
  secondsPerCard: number;
  /** acertos mínimos para concluir a rodada */
  passingScore: number;
}

export interface PublicRapidMission extends MissionBase {
  kind: "rapid";
  cards: PublicRapidCard[];
  secondsPerCard: number;
  passingScore: number;
}

export type RapidVerdict = "safe" | "scam" | "timeout";

export interface RapidAnswerRequest {
  cardId: string;
  verdict: RapidVerdict;
}

export interface RapidAnswerResponse {
  correct: boolean;
  isScam: boolean;
  verdictLabel: string;
  explanation: string;
}

// ---------- Desafio Final (estilo quiz cronometrado) ----------

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
}

export interface QuizMission extends MissionBase {
  kind: "quiz";
  questions: QuizQuestion[];
  /** cronômetro da RODADA inteira, não por pergunta */
  roundSeconds: number;
  passingScore: number;
}

export interface PublicQuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export interface PublicQuizMission extends MissionBase {
  kind: "quiz";
  questions: PublicQuizQuestion[];
  roundSeconds: number;
  passingScore: number;
}

// ---------- Encontre os sinais (spot the phish) ----------

export interface SpotLine {
  id: string;
  text: string;
}

/** Server-only: quais linhas são sinais e por quê. */
export interface SpotMission extends MissionBase {
  kind: "spot";
  /** cabeçalho da mensagem exibido antes das linhas */
  header: { channel: string; subject: string };
  lines: SpotLine[];
  flaggedIds: string[];
  explanations: Record<string, string>;
}

export interface PublicSpotMission extends MissionBase {
  kind: "spot";
  header: { channel: string; subject: string };
  lines: SpotLine[];
}

// ---------- Ordem de resposta (tabletop) ----------

export interface SequenceStep {
  id: string;
  text: string;
}

/** Server-only: `steps` está na ORDEM CORRETA. */
export interface SequenceMission extends MissionBase {
  kind: "sequence";
  scenario: string;
  steps: SequenceStep[];
  /** por que esta ordem, exibido na devolutiva */
  rationale: string;
}

export interface PublicSequenceMission extends MissionBase {
  kind: "sequence";
  scenario: string;
  /** embaralhados no servidor */
  steps: SequenceStep[];
}

export type Mission =
  | ChoiceMission
  | CensorMission
  | RapidMission
  | QuizMission
  | SpotMission
  | SequenceMission;

// ---------- Projeções públicas (sem gabarito) ----------

export interface PublicChoiceMission extends MissionBase {
  kind: "phishing" | "sms";
  message: { sender: string; subject: string; body: string };
  options: Array<{ id: string; label: string }>;
}

export interface PublicCensorMission extends MissionBase {
  kind: "censor";
  prompt: PromptLine[];
}

export type PublicMission =
  | PublicChoiceMission
  | PublicCensorMission
  | PublicRapidMission
  | PublicQuizMission
  | PublicSpotMission
  | PublicSequenceMission;

export interface TrackResponse {
  sectorId: SectorId;
  missions: PublicMission[];
}

// ---------- Validação ----------

export type ValidationRequest =
  | {
      kind: "choice";
      sectorId: SectorId;
      missionId: string;
      optionId: string;
      hintUsed: boolean;
      /** tentativa atual, 1-based — define o degrau de XP e o Modo Guiado */
      attempt: number;
    }
  | {
      kind: "censor";
      sectorId: SectorId;
      missionId: string;
      maskedLineIds: string[];
      hintUsed: boolean;
      attempt: number;
    }
  | RapidRoundRequest
  | QuizRoundRequest
  | {
      kind: "spot";
      sectorId: SectorId;
      missionId: string;
      flaggedIds: string[];
      hintUsed: boolean;
      attempt: number;
    }
  | {
      kind: "sequence";
      sectorId: SectorId;
      missionId: string;
      orderedIds: string[];
      hintUsed: boolean;
      attempt: number;
    };

export interface RapidRoundRequest {
  kind: "rapid";
  sectorId: SectorId;
  missionId: string;
  hintUsed: boolean;
  attempt: number;
  answers: Array<{ cardId: string; verdict: RapidVerdict }>;
}

export interface QuizRoundRequest {
  kind: "quiz";
  sectorId: SectorId;
  missionId: string;
  hintUsed: boolean;
  attempt: number;
  /** optionId null = não respondida (tempo acabou) */
  answers: Array<{ questionId: string; optionId: string | null }>;
  /** true quando a rodada foi encerrada pelo cronômetro */
  timedOut: boolean;
}

export interface QuizBreakdownItem {
  questionId: string;
  prompt: string;
  correct: boolean;
  correctOptionId: string;
  explanation: string;
}

export interface ValidationResponse {
  correct: boolean;
  /** feedback didático exibido no modal */
  message: string;
  /** XP calculado no servidor — o cliente nunca decide quanto ganhou */
  xpAwarded: number;
  /** true quando o colaborador esgotou os escudos e entrou no Modo Guiado */
  guided: boolean;
  /** no Modo Guiado da missão de censura, aponta as linhas de risco */
  revealedLineIds?: string[];
  /** rótulos dos detectores que dispararam */
  findings?: string[];
  /** devolutiva pergunta a pergunta do Desafio Final */
  quizBreakdown?: QuizBreakdownItem[];
  /** Encontre os sinais: explicação de cada linha marcada corretamente/perdida */
  spotBreakdown?: Array<{ lineId: string; text: string; status: "hit" | "missed" | "false"; why?: string }>;
  /** Ordem de resposta: sequência correta com o passo do jogador ao lado */
  sequenceBreakdown?: Array<{ position: number; text: string; playerText: string; correct: boolean }>;
}

// ---------- CyberPedia ----------

export type ArticleIconName =
  | "Wifi"
  | "Eye"
  | "Package"
  | "Cloud"
  | "FileText"
  | "ShieldAlert"
  | "Users"
  | "Fish"
  | "Link2Off"
  | "Lock"
  | "Usb"
  | "DoorOpen"
  | "Bot"
  | "CloudOff"
  | "BrainCircuit"
  | "CreditCard"
  | "KeyRound"
  | "Headset"
  | "ShoppingCart";

export type FlowIconName =
  | "Mail" | "Link" | "Lock" | "Coins" | "FileText" | "Cloud" | "DoorOpen" | "Server"
  | "CreditCard" | "Code" | "Phone" | "UserX" | "KeyRound" | "ShieldAlert" | "Usb" | "Bot"
  | "Building2" | "Truck" | "MessageSquare" | "Eye" | "QrCode" | "Mic" | "Smartphone"
  | "Printer" | "Users" | "BadgeCheck" | "Wifi" | "Package" | "CloudOff" | "Radar";

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  icon: ArticleIconName;
  /** tempo estimado de leitura, em minutos */
  readingMinutes: number;
  tags: string[];
  family: string;
  /** resumo em UMA frase, linguagem do dia a dia */
  tldr: string;
  /** diagrama animado: três etapas do ataque, poucas palavras cada */
  flow: [string, string, string];
  /** ícone de cada etapa — o que diferencia visualmente um verbete do outro */
  flowIcons: [FlowIconName, FlowIconName, FlowIconName];
  whatItIs: string;
  /** "Como o golpe acontece" — passos curtos, sem jargão */
  howTheyAct: string[];
  /** "O que você faz" — ações observáveis, no imperativo */
  defense: string[];
  takeaway: string;
  /** número real com fonte, exibido em destaque */
  stat?: { value: string; label: string; source: string };
  /** bloco opcional para quem quer o detalhe técnico */
  deepDive?: { title: string; body: string };
}

// ---------- Painel CISO / SOC ----------

export type RiskLevel = "critico" | "alto" | "medio" | "baixo";

export interface SectorRisk {
  sectorId: SectorId;
  label: string;
  level: RiskLevel;
  /** 0-100, quanto maior pior */
  riskScore: number;
  /** % de colaboradores que concluíram a trilha */
  coverage: number;
  /** % de simulações respondidas corretamente */
  resilience: number;
  headcount: number;
  /** vetor com maior taxa de falha no período */
  topVector: string;
  trend: "up" | "down" | "flat";
}

export interface ThreatEvent {
  id: string;
  /** dias atrás (0 = hoje) */
  daysAgo: number;
  vector: string;
  sectorLabel: string;
  severity: RiskLevel;
  simulated: number;
  failed: number;
  note: string;
}

export interface RecommendedAction {
  id: string;
  priority: "alta" | "media";
  title: string;
  detail: string;
  owner: string;
  due: string;
}

export interface Benchmark {
  label: string;
  /** indicador da rede; "—" quando não medimos internamente */
  ours: string;
  market: string;
  source: string;
}

export interface GrcSnapshot {
  generatedAt: string;
  windowDays: number;
  kpis: {
    humanResilience: number;
    resilienceDelta: number;
    mitigatedIncidents: number;
    reportRateMinutes: number;
    trainingCoverage: number;
    activeEmployees: number;
  };
  sectors: SectorRisk[];
  feed: ThreatEvent[];
  /** índice de risco das últimas 6 semanas, por setor */
  history: Record<string, number[]>;
  actions: RecommendedAction[];
  benchmarks: Benchmark[];
}

// ---------- Diagnóstico e trilha personalizada ----------

/** Dimensões de risco usadas para casar perfil e módulo. */
export type RiskTag =
  | "cliente"
  | "ia"
  | "fisico"
  | "financeiro"
  | "acesso"
  | "lideranca"
  | "tecnico";

export interface AssessmentOption {
  id: string;
  label: string;
  /** peso somado ao perfil por dimensão */
  weights: Partial<Record<RiskTag, number>>;
  /** afinidade com trilhas prontas — decide Rapid Fire e Desafio Final */
  sectorAffinity?: Partial<Record<SectorId, number>>;
  /** frase usada na justificativa de cada módulo escolhido */
  rationale: string;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  help?: string;
  options: AssessmentOption[];
}

export interface PublicAssessmentQuestion {
  id: string;
  prompt: string;
  help?: string;
  options: Array<{ id: string; label: string }>;
}

export interface ComposedModule {
  mission: PublicMission;
  /** trilha de origem — necessária para validar a resposta no servidor */
  sourceSector: SectorId;
  sourceLabel: string;
  /** por que este módulo entrou na trilha desta pessoa */
  reason: string;
}

export interface TrackPlanResponse {
  modules: ComposedModule[];
  /** perfil de risco resultante, em ordem decrescente */
  profile: Array<{ tag: RiskTag; label: string; score: number }>;
  baseSector: SectorId;
  baseSectorLabel: string;
}
