"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Activity,
  BadgeCheck,
  Link,
  Package,
  Wifi,
  Printer,
  Mic,
  QrCode,
  Eye,
  ShieldAlert,
  UserX,
  Phone,
  Code,
  Cloud,
  FileText,
  Coins,
  Bot,
  BrainCircuit,
  CloudOff,
  CreditCard,
  DoorOpen,
  Fish,
  Link2Off,
  Radar,
  Usb,
  Zap,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  ChartNoAxesColumn,
  ChevronDown,
  CircleCheckBig,
  Clock,
  Crown,
  Flag,
  Flame,
  GaugeCircle,
  GraduationCap,
  Headset,
  Heart,
  KeyRound,
  Info,
  Lightbulb,
  ListChecks,
  Lock,
  LogOut,
  Mail,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Minus,
  RadioTower,
  RotateCcw,
  Scale,
  Server,
  Shield,
  Smartphone,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Swords,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { CYBERPEDIA } from "@/lib/cyberpedia";
import { positionFor, tierFor } from "@/lib/league";
import { SECTORS } from "@/lib/sectors";
import type {
  Article,
  ArticleIconName,
  FlowIconName,
  PublicQuizMission,
  PublicSequenceMission,
  PublicSpotMission,
  PublicRapidCard,
  PublicRapidMission,
  PublicAssessmentQuestion,
  QuizBreakdownItem,
  TrackPlanResponse,
  RapidAnswerResponse,
  RapidVerdict,
  GrcSnapshot,
  PublicChoiceMission,
  PublicMission,
  RiskLevel,
  SectorIconName,
  SectorId,
  SectorRisk,
  ThreatEvent,
  TrackResponse,
  ValidationResponse,
} from "@/lib/types";

// ============================================================
// CONSTANTES, TIPOS LOCAIS E HELPERS
// ============================================================

/** Escudos antes do Modo Guiado. Espelha SHIELDS no route handler. */
const SHIELDS = 3;

/** O crachá do painel executivo não é uma trilha de jogo. */
const CISO_BADGE = "ciso" as const;
/** Trilha montada por diagnóstico — não é um setor do catálogo. */
const CUSTOM_BADGE = "custom" as const;
type BadgeId = SectorId | typeof CISO_BADGE | typeof CUSTOM_BADGE;
/** Chave de progresso: os seis setores mais a trilha personalizada. */
type TrackKey = SectorId | typeof CUSTOM_BADGE;

const SECTOR_ICONS: Record<SectorIconName, LucideIcon> = {
  ShoppingBag,
  Truck,
  Building2,
  Server,
  Headset,
  Crown,
};

const ARTICLE_ICONS: Record<ArticleIconName, LucideIcon> = {
  Wifi,
  Eye,
  Package,
  Cloud,
  FileText,
  ShieldAlert,
  Users,
  Fish,
  Link2Off,
  Lock,
  Usb,
  DoorOpen,
  Bot,
  CloudOff,
  BrainCircuit,
  CreditCard,
  KeyRound,
  Headset,
  ShoppingCart,
};

// ============================================================
// PERSISTÊNCIA DE SESSÃO
// Um F5 no meio da demo não pode zerar progresso, XP, ofensiva,
// escudos nem o impacto acumulado no painel CISO. sessionStorage
// (e não localStorage) porque o estado é da sessão de demonstração:
// fechar a aba começa limpo no próximo ensaio.
// ============================================================

const STORAGE_KEY = "bytequest:session:v1";

/**
 * O preview de celular roda a MESMA aplicação dentro de um iframe, na
 * mesma aba e mesma origem — portanto compartilharia o sessionStorage
 * e sobrescreveria o progresso da janela principal. Cada instância usa
 * a sua chave.
 */
function isPreviewWindow(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("preview");
}

function sessionKey(): string {
  return isPreviewWindow() ? `${STORAGE_KEY}:preview` : STORAGE_KEY;
}

interface PersistedSession {
  name: string;
  badgeId: BadgeId | null;
  view: View;
  activeMissionId: string | null;
  articleId: string | null;
  progress: Record<TrackKey, SectorProgress>;
  /** plano da trilha personalizada, para sobreviver ao reload */
  plan: TrackPlanResponse | null;
  /** pontuação de liga do Modo Duelo, acumulada na sessão */
  league: LeagueState;
  /** estado do módulo em andamento, para os escudos sobreviverem ao reload */
  runner: Record<string, { attempt: number; hintUsed: boolean; guided: boolean }>;
}

function readSession(): Partial<PersistedSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(sessionKey());
    return raw ? (JSON.parse(raw) as Partial<PersistedSession>) : {};
  } catch {
    // Modo privativo ou storage bloqueado: a demo segue em memória.
    return {};
  }
}

function writeSession(patch: Partial<PersistedSession>): void {
  if (typeof window === "undefined") return;
  try {
    const current = readSession();
    window.sessionStorage.setItem(sessionKey(), JSON.stringify({ ...current, ...patch }));
  } catch {
    /* storage indisponível — silencioso de propósito */
  }
}

function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(sessionKey());
  } catch {
    /* nada a fazer */
  }
}

/**
 * O app só monta depois da hidratação. Sem isso, ler sessionStorage no
 * inicializador do estado produziria markup diferente no servidor e no
 * cliente. Assim os inicializadores leem o storage com segurança.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const KIND_LABEL: Record<PublicMission["kind"], string> = {
  phishing: "Cenário",
  sms: "Smishing",
  censor: "DLP",
  rapid: "Rapid Fire",
  quiz: "Desafio final",
  spot: "Encontre os sinais",
  sequence: "Ordem de resposta",
};

type View =
  | "onboarding"
  | "portal"
  | "duelo"
  | "diagnostico"
  | "map"
  | "briefing"
  | "mission"
  | "pedia"
  | "article"
  | "ciso";

type MissionStatus = "done" | "review" | "current" | "locked";

/** Progresso de UMA trilha. */
interface SectorProgress {
  xp: number;
  streak: number;
  /** erros cometidos nas simulações — alimenta o painel CISO */
  failures: number;
  completed: string[];
  /** concluídas com dificuldade — voltam na fila de revisão */
  review: string[];
}

/** Progresso de liga do Modo Duelo — acumulado entre partidas. */
interface LeagueState {
  points: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
}

const EMPTY_LEAGUE: LeagueState = { points: 0, matches: 0, wins: 0, draws: 0, losses: 0 };

const EMPTY_PROGRESS: SectorProgress = { xp: 0, streak: 0, failures: 0, completed: [], review: [] };

/**
 * BUG 1 — progresso por trilha.
 * Antes existia um único `xp`/`streak` global, zerado no logout. Agora
 * cada setor tem o próprio registro e trocar de crachá só muda qual
 * deles está em foco: nada é apagado.
 */
function initialProgress(): Record<TrackKey, SectorProgress> {
  const base = SECTORS.reduce(
    (acc, sector) => {
      acc[sector.id] = { ...EMPTY_PROGRESS, completed: [], review: [] };
      return acc;
    },
    {} as Record<TrackKey, SectorProgress>,
  );
  base[CUSTOM_BADGE] = { ...EMPTY_PROGRESS, completed: [], review: [] };
  return base;
}

const RISK_STYLES: Record<RiskLevel, { label: string; chip: string; bar: string; dot: string }> = {
  critico: {
    label: "Crítico",
    chip: "border-red-500/40 bg-red-500/15 text-red-300",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  alto: {
    label: "Alto",
    chip: "border-orange-500/40 bg-orange-500/15 text-orange-300",
    bar: "bg-orange-500",
    dot: "bg-orange-500",
  },
  medio: {
    label: "Médio",
    chip: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
  },
  baixo: {
    label: "Baixo",
    chip: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
};

function relativeDay(daysAgo: number): string {
  if (daysAgo === 0) return "hoje";
  if (daysAgo === 1) return "ontem";
  return `há ${daysAgo} dias`;
}

// ============================================================
// PÁGINA — estado, navegação e carregamento
// ============================================================

interface LoadedTrack {
  sectorId: SectorId;
  missions: PublicMission[];
}

export default function ByteQuestPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <BootSplash />;
  return <ByteQuestApp />;
}

function BootSplash() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-black">
      <div className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-emerald-500">
        <Shield size={20} strokeWidth={2.5} className="text-white" aria-hidden />
      </div>
    </div>
  );
}

function ByteQuestApp() {
  // lido uma única vez, já do lado do cliente (o app só monta pós-hidratação)
  const [restored] = useState<Partial<PersistedSession>>(readSession);
  const [previewWindow] = useState(isPreviewWindow);

  const [view, setView] = useState<View>(restored.view ?? "onboarding");
  const [menuOpen, setMenuOpen] = useState(false);

  const [name, setName] = useState(restored.name ?? "");
  const [badgeId, setBadgeId] = useState<BadgeId | null>(restored.badgeId ?? null);

  // BUG 1: um registro por setor, preservado entre trocas de crachá.
  const [progress, setProgress] = useState<Record<TrackKey, SectorProgress>>(
    () => ({ ...initialProgress(), ...(restored.progress ?? {}) }),
  );
  const [runner, setRunner] = useState<PersistedSession["runner"]>(restored.runner ?? {});

  const [track, setTrack] = useState<LoadedTrack | null>(null);
  const [failedSector, setFailedSector] = useState<SectorId | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(
    restored.activeMissionId ?? null,
  );
  const [articleId, setArticleId] = useState<string | null>(restored.articleId ?? null);
  const [plan, setPlan] = useState<TrackPlanResponse | null>(restored.plan ?? null);
  const [league, setLeague] = useState<LeagueState>(restored.league ?? EMPTY_LEAGUE);

  const isCiso = badgeId === CISO_BADGE;
  const isCustom = badgeId === CUSTOM_BADGE;
  const sectorId: SectorId | null =
    isCiso || isCustom || badgeId === null ? null : badgeId;
  const sector = SECTORS.find((s) => s.id === sectorId) ?? null;
  const trackKey: TrackKey | null = isCustom ? CUSTOM_BADGE : sectorId;
  const current = trackKey ? progress[trackKey] : EMPTY_PROGRESS;

  // Loading/erro derivados da chave da requisição: o efeito nunca chama
  // setState de forma síncrona (react-hooks/set-state-in-effect).
  const planMissions = plan?.modules.map((module) => module.mission) ?? [];
  const missions = isCustom ? planMissions : track?.sectorId === sectorId ? track.missions : [];
  const loading = sectorId !== null && track?.sectorId !== sectorId && failedSector !== sectorId;
  const loadError = sectorId !== null && failedSector === sectorId;

  /** Setor de origem do módulo — o servidor valida contra a trilha real. */
  const sectorOfMission = (missionId: string): SectorId | null => {
    if (!isCustom) return sectorId;
    return plan?.modules.find((m) => m.mission.id === missionId)?.sourceSector ?? null;
  };

  useEffect(() => {
    if (!sectorId) return;
    const controller = new AbortController();

    fetch(`/api/missions?sector=${sectorId}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<TrackResponse>;
      })
      .then((data) => setTrack({ sectorId: data.sectorId, missions: data.missions }))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setFailedSector(sectorId);
      });

    return () => controller.abort();
  }, [sectorId]);

  // Salva o estado durável a cada mudança. Efeito sem setState, então
  // não esbarra em react-hooks/set-state-in-effect.
  useEffect(() => {
    writeSession({ name, badgeId, view, activeMissionId, articleId, progress, runner, plan, league });
  }, [name, badgeId, view, activeMissionId, articleId, progress, runner, plan, league]);

  const activeIndex = missions.findIndex((m) => m.id === activeMissionId);
  const article = CYBERPEDIA.find((a) => a.id === articleId) ?? null;

  /**
   * Normalização da tela após restaurar a sessão. Um F5 pode devolver
   * uma combinação que já não faz sentido — "map" com trilha
   * personalizada sem plano, "mission" com missão que ainda não
   * carregou, "diagnostico" num crachá de setor. Sem isto, cada uma
   * dessas combinações renderizava tela em branco.
   */
  const missionMissing = activeIndex < 0;
  const screen: View = (() => {
    if (isCiso) return view === "pedia" || view === "article" ? view : "ciso";
    if (isCustom && !plan) return "diagnostico";
    if (view === "diagnostico" && !isCustom) return "map";
    if ((view === "briefing" || view === "mission") && missionMissing && !loading) return "map";
    if (view === "article" && !article) return "pedia";
    if (view === "duelo") return "duelo";
    if (view === "ciso" || view === "onboarding" || view === "portal") return "map";
    return view;
  })();
  const activeMission = activeIndex >= 0 ? missions[activeIndex] : null;

  const statusOf = useCallback(
    (index: number, missionId: string): MissionStatus => {
      if (current.review.includes(missionId)) return "review";
      if (current.completed.includes(missionId)) return "done";
      return index <= current.completed.length ? "current" : "locked";
    },
    [current],
  );

  const handleComplete = useCallback(
    (missionId: string, earnedXp: number, struggled: boolean) => {
      if (!trackKey) return;
      // módulo concluído: descarta o estado de execução salvo
      setRunner((current) => {
        const next = { ...current };
        delete next[missionId];
        return next;
      });
      setProgress((all) => {
        const entry = all[trackKey];
        return {
          ...all,
          [trackKey]: {
            xp: entry.xp + earnedXp,
            streak: entry.streak + 1,
            completed: entry.completed.includes(missionId)
              ? entry.completed
              : [...entry.completed, missionId],
            review: struggled
              ? entry.review.includes(missionId)
                ? entry.review
                : [...entry.review, missionId]
              : entry.review.filter((id) => id !== missionId),
          },
        };
      });
      setView("map");
    },
    [trackKey],
  );

  /**
   * Cada erro sobe o risco da UNIDADE de origem do módulo no painel CISO,
   * mesmo quando o módulo foi jogado dentro da trilha personalizada —
   * senão a telemetria executiva perderia a atribuição por setor.
   */
  const handleFailure = useCallback(
    (failureSector: SectorId | null) => {
      if (!failureSector) return;
      setProgress((all) => ({
        ...all,
        [failureSector]: {
          ...all[failureSector],
          failures: all[failureSector].failures + 1,
        },
      }));
    },
    [],
  );

  /**
   * Persistência do estado do módulo em andamento. Estável (useCallback
   * sem dependências) e com bail-out: se escudos, dica e Modo Guiado não
   * mudaram, devolve o MESMO objeto e o React não re-renderiza. Sem os
   * dois cuidados, o efeito do runner entrava em loop de atualização.
   */
  const handleRunnerState = useCallback(
    (missionId: string, next: { attempt: number; hintUsed: boolean; guided: boolean }) => {
      setRunner((current) => {
        const previous = current[missionId];
        if (
          previous &&
          previous.attempt === next.attempt &&
          previous.hintUsed === next.hintUsed &&
          previous.guided === next.guided
        ) {
          return current;
        }
        return { ...current, [missionId]: next };
      });
    },
    [],
  );

  /** Trocar crachá: volta ao onboarding SEM apagar nada. */
  const handleSwitchBadge = () => {
    setMenuOpen(false);
    setView("onboarding");
    setBadgeId(null);
    setActiveMissionId(null);
  };

  /** Zera a demo por inteiro — útil entre um ensaio e outro. */
  const handleResetDemo = () => {
    clearSession();
    setMenuOpen(false);
    setView("onboarding");
    setBadgeId(null);
    setActiveMissionId(null);
    setArticleId(null);
    setProgress(initialProgress());
    setRunner({});
    setPlan(null);
    setLeague(EMPTY_LEAGUE);
  };

  const startBadge = () => {
    if (!badgeId) return;
    if (badgeId === CISO_BADGE) return setView("ciso");
    // A trilha personalizada só existe depois do diagnóstico.
    if (badgeId === CUSTOM_BADGE) return setView(plan ? "map" : "diagnostico");
    setView("map");
  };

  const navigate = (next: View) => {
    setMenuOpen(false);
    setView(next);
  };

  // Portal corporativo: autenticação simulada antes do painel executivo.
  /**
   * Embrulha qualquer tela com o lançador do preview de celular.
   * Dentro do próprio preview ele não aparece — evita recursão de
   * iframes e mantém a moldura limpa na demonstração.
   */
  const withPreview = (node: React.ReactNode) => (
    <>
      {node}
      {!previewWindow && <DevicePreview />}
    </>
  );

  if (badgeId === null && view === "portal") {
    return withPreview(
      <CorporatePortal
        onAuthenticated={() => {
          setBadgeId(CISO_BADGE);
          setView("ciso");
        }}
        onCancel={() => setView("onboarding")}
      />
    );
  }

  // A CyberPedia é pública: consulta livre antes mesmo do crachá.
  if (badgeId === null && (view === "pedia" || view === "article")) {
    return withPreview(
      <PublicLibrary
        view={view}
        article={article}
        onOpenArticle={(id) => {
          setArticleId(id);
          setView("article");
        }}
        onBackToList={() => setView("pedia")}
        onExit={() => setView("onboarding")}
      />
    );
  }

  if (view === "onboarding" || badgeId === null) {
    return withPreview(
      <Onboarding
        name={name}
        badgeId={badgeId}
        progress={progress}
        onNameChange={setName}
        onBadgeChange={setBadgeId}
        onStart={startBadge}
        onOpenLibrary={() => setView("pedia")}
        onOpenPortal={() => setView("portal")}
        savedPlan={plan}
        customProgress={progress[CUSTOM_BADGE]}
      />
    );
  }

  return withPreview(
    <AppShell
      name={name}
      contextLabel={
        isCiso
          ? "Visão executiva"
          : isCustom
            ? "Trilha personalizada"
            : `Trilha ${sector?.label ?? ""}`
      }
      xp={isCiso ? null : current.xp}
      streak={isCiso ? null : current.streak}
      isCiso={isCiso}
      isCustom={isCustom}
      menuOpen={menuOpen}
      activeView={screen}
      onToggleMenu={() => setMenuOpen((open) => !open)}
      onNavigate={navigate}
      onSwitchBadge={handleSwitchBadge}
      onResetDemo={handleResetDemo}
      onRedoDiagnosis={() => {
        // Refaz só o diagnóstico: o progresso da trilha atual é
        // descartado junto, porque os módulos mudam.
        setMenuOpen(false);
        setPlan(null);
        setActiveMissionId(null);
        setProgress((all) => ({
          ...all,
          [CUSTOM_BADGE]: { ...EMPTY_PROGRESS, completed: [], review: [] },
        }));
        setView("diagnostico");
      }}
    >
      {screen === "ciso" && <CisoDashboard progress={progress} />}

      {screen === "duelo" && trackKey && (
        <DuelScreen
          playerName={name}
          league={league}
          onOpenArticle={(articleId) => {
            setArticleId(articleId);
            setView("article");
          }}
          onFinish={(xp, standing, result) => {
            setProgress((all) => ({
              ...all,
              [trackKey]: { ...all[trackKey], xp: all[trackKey].xp + xp },
            }));
            setLeague((current) => ({
              points: standing.points,
              matches: current.matches + 1,
              wins: current.wins + (result === "win" ? 1 : 0),
              draws: current.draws + (result === "draw" ? 1 : 0),
              losses: current.losses + (result === "loss" ? 1 : 0),
            }));
          }}
          onExit={() => setView("map")}
        />
      )}

      {screen === "diagnostico" && (
        <DiagnosticScreen
          onReady={(result) => {
            setPlan(result);
            setView("map");
          }}
          onCancel={plan ? () => setView("map") : handleSwitchBadge}
          hasTrack={plan !== null}
        />
      )}

      {screen === "map" && (sector || (isCustom && plan)) && (
        <MissionMap
          name={name}
          sectorLabel={isCustom ? "Personalizada" : (sector?.label ?? "")}
          sectorIcon={isCustom ? "Crown" : (sector?.icon ?? "ShoppingBag")}
          custom={isCustom ? plan : null}
          missions={missions}
          statusOf={statusOf}
          loading={loading}
          error={loadError}
          xp={current.xp}
          streak={current.streak}
          reviewCount={current.review.length}
          onOpen={(missionId) => {
            setActiveMissionId(missionId);
            setView("briefing");
          }}
        />
      )}

      {(screen === "briefing" || screen === "mission") && missionMissing && loading && (
        <div className="flex flex-col gap-3 px-5 py-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60"
            />
          ))}
        </div>
      )}

      {screen === "briefing" && activeMission && (
        <Briefing
          mission={activeMission}
          moduleNumber={activeIndex + 1}
          onStart={() => setView("mission")}
          onBack={() => setView("map")}
        />
      )}

      {screen === "mission" && activeMission && sectorOfMission(activeMission.id) && (
        <MissionRunner
          key={activeMission.id}
          mission={activeMission}
          sectorId={sectorOfMission(activeMission.id) as SectorId}
          savedState={runner[activeMission.id]}
          onStateChange={handleRunnerState}
          onComplete={handleComplete}
          onFailure={() => handleFailure(sectorOfMission(activeMission.id))}
          onBack={() => setView("map")}
        />
      )}

      {screen === "pedia" && (
        <CyberPediaList
          onOpen={(id) => {
            setArticleId(id);
            setView("article");
          }}
        />
      )}

      {screen === "article" && article && (
        <ArticleView article={article} onBack={() => setView("pedia")} />
      )}
    </AppShell>
  );
}

// ============================================================
// APP SHELL — header fixo + menu hambúrguer
// ============================================================

function AppShell({
  name,
  contextLabel,
  xp,
  streak,
  isCiso,
  isCustom,
  menuOpen,
  activeView,
  onToggleMenu,
  onNavigate,
  onSwitchBadge,
  onResetDemo,
  onRedoDiagnosis,
  children,
}: {
  name: string;
  contextLabel: string;
  xp: number | null;
  streak: number | null;
  isCiso: boolean;
  isCustom: boolean;
  menuOpen: boolean;
  activeView: View;
  onToggleMenu: () => void;
  onNavigate: (view: View) => void;
  onSwitchBadge: () => void;
  onResetDemo: () => void;
  onRedoDiagnosis: () => void;
  children: React.ReactNode;
}) {
  /**
   * Um único layout, dois formatos. Não perguntamos "celular ou
   * computador": a viewport já responde isso, e perguntar quebraria em
   * tablet, em redimensionamento de janela e em quem projeta a tela.
   * Até `lg` o app mantém a coluna mobile-first com menu hambúrguer;
   * a partir de `lg` a navegação vira barra lateral fixa e o conteúdo
   * ganha largura de leitura confortável.
   */
  return (
    <div className="flex min-h-dvh w-full justify-center bg-black font-sans text-white lg:justify-start">
      {/* Navegação lateral — só no desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-neutral-900 bg-neutral-950/60 p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500">
            <Shield size={18} strokeWidth={2.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black tracking-tight">ByteQuest</div>
            <div className="truncate text-[10px] text-neutral-500">{contextLabel}</div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
          <div className="mb-2 truncate text-sm font-bold">{name || "Colaborador"}</div>
          {isCiso ? (
            <span className="inline-block rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-violet-300 uppercase">
              CISO · SOC
            </span>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-orange-400">
                <Flame size={14} strokeWidth={2.5} aria-hidden />
                <span className="text-sm font-black">{streak}</span>
              </span>
              <span className="flex items-center gap-1 text-violet-400">
                <Star size={14} strokeWidth={2.5} aria-hidden />
                <span className="text-sm font-black">{xp}</span>
              </span>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {isCiso ? (
            <MenuItem
              icon={ChartNoAxesColumn}
              label="Painel CISO / SOC"
              active={activeView === "ciso"}
              onClick={() => onNavigate("ciso")}
            />
          ) : (
            <MenuItem
              icon={MapIcon}
              label="Trilha de missões"
              active={["map", "briefing", "mission"].includes(activeView)}
              onClick={() => onNavigate("map")}
            />
          )}
          {!isCiso && (
            <MenuItem
              icon={Swords}
              label="Duelo"
              active={activeView === "duelo"}
              onClick={() => onNavigate("duelo")}
            />
          )}
          <MenuItem
            icon={BookOpen}
            label="CyberPedia"
            active={activeView === "pedia" || activeView === "article"}
            onClick={() => onNavigate("pedia")}
          />
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-neutral-900 pt-2">
          {isCustom && (
            <MenuItem icon={Sparkles} label="Refazer diagnóstico" onClick={onRedoDiagnosis} />
          )}
          <MenuItem icon={LogOut} label={isCiso ? "Sair do painel" : "Trocar crachá"} onClick={onSwitchBadge} />
          <MenuItem icon={RotateCcw} label="Reiniciar demo" onClick={onResetDemo} danger />
        </div>
      </aside>

      <div className="relative flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-black lg:max-w-none lg:flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 -left-24 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl"
        />

        <header className="relative z-20 flex items-center justify-between border-b border-neutral-900 bg-black/80 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500">
              <Shield size={16} strokeWidth={2.5} aria-hidden />
            </div>
            <span className="truncate text-sm font-black tracking-tight">ByteQuest</span>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {isCiso ? (
              <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-violet-300 uppercase">
                CISO · SOC
              </span>
            ) : (
              <>
                <span
                  className="flex items-center gap-1 text-orange-400"
                  title={`${streak} dias de ofensiva`}
                >
                  <Flame size={15} strokeWidth={2.5} aria-hidden />
                  <span className="text-sm font-black">{streak}</span>
                </span>
                <span
                  className="flex items-center gap-1 text-violet-400"
                  title={`${xp} pontos GRC`}
                >
                  <Star size={15} strokeWidth={2.5} aria-hidden />
                  <span className="text-sm font-black">{xp}</span>
                </span>
              </>
            )}
            <button
              type="button"
              onClick={onToggleMenu}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-1.5 text-neutral-300 hover:bg-neutral-800"
            >
              {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            </button>
          </div>
        </header>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={onToggleMenu}
              className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm"
            />
            <nav className="absolute top-14 right-3 z-40 w-60 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
              <div className="border-b border-neutral-900 px-4 py-3">
                <div className="truncate text-sm font-bold">{name}</div>
                <div className="text-[11px] text-neutral-500">{contextLabel}</div>
              </div>

              {isCiso ? (
                <MenuItem
                  icon={ChartNoAxesColumn}
                  label="Painel CISO / SOC"
                  active={activeView === "ciso"}
                  onClick={() => onNavigate("ciso")}
                />
              ) : (
                <MenuItem
                  icon={MapIcon}
                  label="Trilha de missões"
                  active={["map", "briefing", "mission"].includes(activeView)}
                  onClick={() => onNavigate("map")}
                />
              )}

              {!isCiso && (
                <MenuItem
                  icon={Swords}
                  label="Duelo"
                  active={activeView === "duelo"}
                  onClick={() => onNavigate("duelo")}
                />
              )}
              <MenuItem
                icon={BookOpen}
                label="CyberPedia"
                active={activeView === "pedia" || activeView === "article"}
                onClick={() => onNavigate("pedia")}
              />
              {isCustom && (
                <MenuItem icon={Sparkles} label="Refazer diagnóstico" onClick={onRedoDiagnosis} />
              )}
              <MenuItem icon={LogOut} label="Trocar crachá" onClick={onSwitchBadge} />
              <MenuItem icon={RotateCcw} label="Reiniciar demo" onClick={onResetDemo} danger />
            </nav>
          </>
        )}

        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full flex-1 flex-col lg:max-w-4xl lg:px-4 lg:py-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  active,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors ${
        danger
          ? "text-neutral-400 hover:bg-neutral-900 hover:text-red-300"
          : active
            ? "bg-emerald-500/10 text-emerald-300"
            : "text-neutral-300 hover:bg-neutral-900"
      }`}
    >
      <Icon size={16} aria-hidden />
      {label}
    </button>
  );
}

// ============================================================
// ONBOARDING — crachás de trilha + crachá executivo
// ============================================================

function Onboarding({
  name,
  badgeId,
  progress,
  onNameChange,
  onBadgeChange,
  onStart,
  onOpenLibrary,
  onOpenPortal,
  savedPlan,
  customProgress,
}: {
  name: string;
  badgeId: BadgeId | null;
  progress: Record<SectorId, SectorProgress>;
  onNameChange: (value: string) => void;
  onBadgeChange: (value: BadgeId) => void;
  onStart: () => void;
  onOpenLibrary: () => void;
  onOpenPortal: () => void;
  savedPlan: TrackPlanResponse | null;
  customProgress: SectorProgress;
}) {
  const ready = badgeId !== null && name.trim().length > 0;

  return (
    <div className="flex min-h-dvh w-full justify-center bg-black font-sans text-white">
      <div className="relative flex min-h-dvh w-full max-w-md flex-col overflow-y-auto px-5 pt-12 pb-8 lg:max-w-none lg:flex-row lg:items-stretch lg:px-0 lg:pt-0 lg:pb-0">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl lg:h-[36rem] lg:w-[36rem]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 -left-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl lg:h-[36rem] lg:w-[36rem]"
        />

        {/* Coluna esquerda (desktop): marca, promessa e proposta de valor */}
        <aside className="relative z-10 hidden flex-col justify-between border-r border-neutral-900 bg-gradient-to-b from-neutral-950 to-black p-12 lg:flex lg:w-[46%] xl:w-[42%]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500">
              <Shield size={18} strokeWidth={2.5} aria-hidden />
            </div>
            <span className="text-sm font-bold tracking-tight text-neutral-200">
              Leroy Merlin <span className="text-emerald-400">|</span> ByteQuest
            </span>
          </div>

          <div>
            <h1 className="mb-4 text-5xl leading-[0.95] font-black tracking-tighter xl:text-6xl">
              Bem-vindo ao
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text text-transparent">
                Positive Tech Game
              </span>
            </h1>
            <p className="mb-8 max-w-md text-base leading-relaxed text-neutral-400">
              Três minutos por dia. Cenários da sua operação, não genéricos. Errar faz parte — o
              que conta é reconhecer o golpe na próxima vez que ele chegar.
            </p>
            <div className="grid max-w-md grid-cols-3 gap-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <div className="text-2xl font-black text-emerald-400">60</div>
                <div className="text-[11px] text-neutral-500">módulos em 6 trilhas</div>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <div className="text-2xl font-black text-violet-400">6</div>
                <div className="text-[11px] text-neutral-500">formatos de missão</div>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <div className="text-2xl font-black text-neutral-200">0</div>
                <div className="text-[11px] text-neutral-500">gabaritos no navegador</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-[11px] font-bold text-violet-300 transition-all duration-300 hover:scale-105 hover:bg-violet-500/20"
            >
              <BookOpen size={13} aria-hidden /> CyberPedia
            </button>
            <button
              type="button"
              onClick={onOpenPortal}
              className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[11px] font-bold text-neutral-400 transition-all duration-300 hover:scale-105 hover:text-neutral-200"
            >
              <Lock size={12} aria-hidden /> Acesso corporativo
            </button>
          </div>
        </aside>

        {/* Coluna direita: formulário (no mobile, é a tela inteira) */}
        <div className="relative z-10 flex flex-1 flex-col lg:justify-center lg:overflow-y-auto lg:px-16 lg:py-12 xl:px-24">
          <div className="flex flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-xl lg:flex-none">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500">
              <Shield size={18} strokeWidth={2.5} aria-hidden />
            </div>
            <span className="text-sm font-bold tracking-tight whitespace-nowrap text-neutral-200">
              Leroy Merlin <span className="text-emerald-400">|</span> ByteQuest
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenLibrary}
                aria-label="Abrir CyberPedia"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-[11px] font-bold text-violet-300 transition-all duration-300 hover:scale-105 hover:border-violet-400 hover:bg-violet-500/20"
              >
                <BookOpen size={13} aria-hidden />
                <span className="hidden sm:inline">CyberPedia</span>
              </button>
              {/* O painel executivo não é um crachá entre os outros: é área
                  restrita, e a interface precisa dizer isso. */}
              <button
                type="button"
                onClick={onOpenPortal}
                aria-label="Acesso corporativo"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[11px] font-bold text-neutral-400 transition-all duration-300 hover:scale-105 hover:border-neutral-700 hover:text-neutral-200"
              >
                <Lock size={12} aria-hidden />
                <span className="hidden sm:inline">Acesso corporativo</span>
              </button>
            </div>
          </div>

          <h1 className="mb-2 text-4xl leading-[0.95] font-black tracking-tighter lg:hidden">
            Bem-vindo ao
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text text-transparent">
              Positive Tech Game
            </span>
          </h1>
          <p className="mb-8 text-sm text-neutral-400 lg:hidden">
            O treinamento se molda ao seu setor. Você está prestes a blindar nossa operação.
          </p>
          <div className="mb-6 hidden lg:block">
            <div className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
              Comece aqui
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Identifique-se e escolha a trilha</h2>
          </div>

          <label
            htmlFor="bq-name"
            className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
          >
            Seu nome
          </label>
          <input
            id="bq-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Digite seu nome"
            autoComplete="given-name"
            className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm transition-colors outline-none placeholder:text-neutral-600 focus:border-emerald-500"
          />

          <fieldset className="mb-6">
            <legend className="mb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Escolha seu crachá
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              {SECTORS.map((item) => {
                const Icon = SECTOR_ICONS[item.icon];
                const active = badgeId === item.id;
                const saved = progress[item.id];
                const hasHistory = saved.completed.length > 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onBadgeChange(item.id)}
                    className={`rounded-2xl border p-3.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
                      active
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
                    }`}
                  >
                    <Icon
                      size={20}
                      aria-hidden
                      className={active ? "text-emerald-400" : "text-neutral-400"}
                    />
                    <div className="mt-2 text-sm font-bold">{item.label}</div>
                    <div className="mt-0.5 text-[11px] leading-tight text-neutral-500">
                      {item.tag}
                    </div>
                    {/* progresso salvo daquela trilha — some a prova de que nada foi perdido */}
                    {hasHistory && (
                      <div className="mt-2 flex items-center gap-2 border-t border-neutral-800 pt-2 text-[10px] font-bold">
                        <span className="flex items-center gap-0.5 text-violet-400">
                          <Star size={10} aria-hidden /> {saved.xp}
                        </span>
                        <span className="flex items-center gap-0.5 text-orange-400">
                          <Flame size={10} aria-hidden /> {saved.streak}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Trilha personalizada — montada por diagnóstico */}
          <button
            type="button"
            aria-pressed={badgeId === CUSTOM_BADGE}
            onClick={() => onBadgeChange(CUSTOM_BADGE)}
            className={`mb-3 flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-300 hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
              badgeId === CUSTOM_BADGE
                ? "border-emerald-400 bg-gradient-to-r from-emerald-500/25 to-violet-500/15"
                : "border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-transparent hover:border-emerald-400/70"
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
              <Sparkles size={20} className="text-emerald-300" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">
                  {savedPlan ? "Sua trilha personalizada" : "Não sei meu crachá"}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase ${
                    savedPlan
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {savedPlan ? "Salva" : "Novo"}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] leading-tight text-neutral-400">
                {savedPlan
                  ? `Base ${savedPlan.baseSectorLabel} · ${customProgress.completed.length} de ${savedPlan.modules.length} módulos concluídos`
                  : "Sete perguntas e montamos uma trilha sob medida para sua rotina."}
              </div>
              {/* mesmo indicador de progresso dos crachás de setor */}
              {savedPlan && (customProgress.xp > 0 || customProgress.streak > 0) && (
                <div className="mt-2 flex items-center gap-2 border-t border-neutral-800 pt-2 text-[10px] font-bold">
                  <span className="flex items-center gap-0.5 text-violet-400">
                    <Star size={10} aria-hidden /> {customProgress.xp}
                  </span>
                  <span className="flex items-center gap-0.5 text-orange-400">
                    <Flame size={10} aria-hidden /> {customProgress.streak}
                  </span>
                </div>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={onStart}
            disabled={!ready}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-30 lg:mt-8"
          >
            {badgeId === CUSTOM_BADGE
              ? savedPlan
                ? "Retomar trilha personalizada"
                : "Começar diagnóstico"
              : "Iniciar trilha"}
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </button>

          <button
            type="button"
            onClick={onOpenLibrary}
            className="mt-3 text-center text-xs text-neutral-500 transition-colors hover:text-violet-300"
          >
            Só quero consultar a biblioteca de ameaças →
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PREVIEW DE DISPOSITIVO — demonstrar o mobile a partir do desktop
// ============================================================

/**
 * O layout já se adapta sozinho pela viewport. O problema é de
 * DEMONSTRAÇÃO: numa apresentação feita pelo notebook não há como
 * mostrar o formato de celular.
 *
 * A solução é um iframe da própria aplicação com largura de telefone.
 * Um iframe tem viewport própria, então as mesmas media queries do
 * Tailwind resolvem para o layout mobile — não é uma maquete nem um
 * segundo layout: é o mesmo código, no mesmo build, numa janela menor.
 */
const DEVICE_PRESETS = [
  { id: "phone", label: "Celular", sub: "390 × 844", width: 390, height: 844 },
  { id: "tablet", label: "Tablet", sub: "820 × 1000", width: 820, height: 1000 },
] as const;

function DevicePreview() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<(typeof DEVICE_PRESETS)[number]>(DEVICE_PRESETS[0]);
  const [reloadKey, setReloadKey] = useState(0);

  // Fecha com Esc — atalho esperado em qualquer sobreposição.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* O botão só existe onde faz sentido: em tela grande. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-40 hidden items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/90 px-4 py-2.5 text-xs font-bold text-neutral-200 shadow-2xl backdrop-blur transition-all duration-300 hover:scale-105 hover:border-emerald-500/60 hover:text-emerald-300 lg:flex"
      >
        <Smartphone size={14} aria-hidden /> Ver no celular
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-6 py-6 backdrop-blur-sm">
          <div className="mb-4 flex w-full max-w-3xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {DEVICE_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreset(item)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all duration-300 ${
                    preset.id === item.id
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {item.label} <span className="font-mono opacity-60">{item.sub}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  // O iframe compartilha o sessionStorage da aba: remontar
                  // sem limpar a chave do preview restaura a sessão antiga
                  // e parece que nada aconteceu.
                  try {
                    window.sessionStorage.removeItem(`${STORAGE_KEY}:preview`);
                  } catch {
                    /* storage indisponível */
                  }
                  setReloadKey((current) => current + 1);
                }}
                className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[11px] font-bold text-neutral-400 transition-colors hover:text-neutral-200"
              >
                Reiniciar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar preview"
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          {/* Moldura do aparelho */}
          <div
            className="relative shrink-0 overflow-hidden rounded-[2.2rem] border-[10px] border-neutral-800 bg-black shadow-2xl"
            style={{
              width: preset.width,
              height: preset.height,
              maxWidth: "calc(100vw - 6rem)",
              maxHeight: "calc(100vh - 9rem)",
            }}
          >
            <iframe
              key={`${preset.id}-${reloadKey}`}
              src="/?preview=1"
              title={`ByteQuest em ${preset.label}`}
              className="h-full w-full border-0"
            />
          </div>

          <p className="mt-4 max-w-md text-center text-[11px] leading-relaxed text-neutral-500">
            Mesma aplicação, mesmo build — apenas numa viewport de {preset.width}px. A sessão do
            preview é independente da janela principal.
          </p>
        </div>
      )}
    </>
  );
}

// ============================================================
// MODO DUELO — partida 1v1 contra oponente simulado
// ============================================================

interface DuelMatch {
  matchId: string;
  opponent: { name: string; handle: string; tier: string; unit: string; rating: number; avatar: string };
  questions: Array<{
    id: string;
    category: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
  }>;
  secondsPerQuestion: number;
  total: number;
}

interface DuelStanding {
  tier: string;
  progress: number;
  points: number;
  delta: number;
  toNext: number;
  globalRank: number;
  unitRank: number;
  percentile: number;
  accuracy: number;
}

interface DuelRound {
  correct: boolean;
  correctOptionId: string;
  explanation: string;
  /** verbete da CyberPedia que responde a pergunta */
  article: string;
  /** ao fim da partida: verbetes das perguntas erradas */
  review: string[];
  bot: { correct: boolean; optionId: string; ms: number };
  scores: { you: number; opponent: number };
  hits: { you: number; opponent: number };
  finished: boolean;
  xpAwarded: number;
  result: "win" | "draw" | "loss" | null;
  standing: DuelStanding | null;
}

type DuelPhase = "lobby" | "matching" | "found" | "playing" | "over";

/** Selo de liga — mesmo desenho nas duas pontas do confronto. */
function TierBadge({ tier, size = "sm" }: { tier: string; size?: "sm" | "lg" }) {
  const gold = tier.startsWith("Ouro");
  const silver = tier.startsWith("Prata");
  const tone = gold
    ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
    : silver
      ? "border-neutral-400/50 bg-neutral-400/10 text-neutral-200"
      : "border-orange-700/60 bg-orange-700/10 text-orange-400";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold ${tone} ${
        size === "lg" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      <Shield size={size === "lg" ? 12 : 10} aria-hidden /> {tier}
    </span>
  );
}

function Fighter({
  initials,
  name,
  handle,
  tier,
  accent,
  align = "left",
}: {
  initials: string;
  name: string;
  handle: string;
  tier: string;
  accent: "emerald" | "violet";
  align?: "left" | "right";
}) {
  const ring = accent === "emerald" ? "border-emerald-400/70" : "border-violet-400/70";
  const glow = accent === "emerald" ? "bg-emerald-500/20" : "bg-violet-500/20";
  return (
    <div className={`flex flex-col items-center ${align === "right" ? "order-3" : ""}`}>
      <div className="relative mb-2 flex h-20 w-20 items-center justify-center">
        <span className={`absolute h-full w-full rounded-full ${glow} blur-xl`} aria-hidden />
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 bg-neutral-950 text-lg font-black ${ring}`}
        >
          {initials}
        </div>
      </div>
      <div className="max-w-[9rem] truncate text-sm font-black">{name}</div>
      <div className="mb-1.5 font-mono text-[10px] tracking-wider text-neutral-500 uppercase">
        {handle}
      </div>
      <TierBadge tier={tier} />
    </div>
  );
}

function DuelScreen({
  playerName,
  league,
  onOpenArticle,
  onFinish,
  onExit,
}: {
  playerName: string;
  league: LeagueState;
  onOpenArticle: (articleId: string) => void;
  onFinish: (
    xp: number,
    standing: DuelStanding,
    result: "win" | "draw" | "loss",
  ) => void;
  onExit: () => void;
}) {
  const status = tierFor(league.points);
  const position = positionFor(league.points, playerName);
  const [phase, setPhase] = useState<DuelPhase>("lobby");
  const [match, setMatch] = useState<DuelMatch | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ optionId: string | null; ms: number }>>([]);
  const [round, setRound] = useState<DuelRound | null>(null);
  // O placar vive FORA do round: antes ele era lido de `round`, que é
  // zerado a cada pergunta — e o placar voltava a 0x0 na tela.
  const [scores, setScores] = useState({ you: 0, opponent: 0 });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [botAnswered, setBotAnswered] = useState(false);

  const seconds = match?.secondsPerQuestion ?? 15;
  const remaining = startedAt === 0 ? seconds * 1000 : Math.max(0, seconds * 1000 - (now - startedAt));
  const ratio = remaining / (seconds * 1000);

  const submitRef = useRef<(optionId: string | null) => void>(() => {});

  const playerInitials = (playerName.trim() || "Você")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const send = useCallback(
    async (optionId: string | null, ms: number) => {
      if (!match || busy) return;
      setBusy(true);
      setStartedAt(0);
      const next = [...answers, { optionId, ms }];
      setAnswers(next);
      try {
        const response = await fetch("/api/duelo/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: match.matchId,
            answers: next,
            leaguePoints: league.points,
            playerName,
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as DuelRound;
        setRound(data);
        setScores(data.scores);
      } catch {
        setFailed(true);
      } finally {
        setBusy(false);
      }
    },
    [answers, busy, league.points, match, playerName, setRound, setScores],
  );

  useEffect(() => {
    submitRef.current = (optionId: string | null) => {
      void send(optionId, startedAt === 0 ? seconds * 1000 : Date.now() - startedAt);
    };
  }, [seconds, send, startedAt]);

  useEffect(() => {
    if (phase !== "playing" || startedAt === 0 || round) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current - startedAt >= seconds * 1000) {
        clearInterval(id);
        submitRef.current(null);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, startedAt, seconds, round]);

  useEffect(() => {
    if (phase !== "playing" || startedAt === 0 || round) return;
    const delay = 3000 + ((index * 2654435761) % 6000);
    const id = setTimeout(() => setBotAnswered(true), delay);
    return () => clearTimeout(id);
  }, [phase, startedAt, index, round]);

  const beginQuestion = () => {
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
  };

  const startMatch = async () => {
    setPhase("matching");
    setFailed(false);
    try {
      const response = await fetch("/api/duelo");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as DuelMatch;
      setTimeout(() => {
        setMatch(data);
        setIndex(0);
        setAnswers([]);
        setRound(null);
        setScores({ you: 0, opponent: 0 });
        setBotAnswered(false);
        setPhase("found");
        // tela de confronto antes da primeira pergunta
        setTimeout(() => {
          setPhase("playing");
          beginQuestion();
        }, 2600);
      }, 2200);
    } catch {
      setFailed(true);
      setPhase("lobby");
    }
  };

  const nextQuestion = () => {
    if (!round || !match) return;
    if (round.finished && round.standing && round.result) {
      onFinish(round.xpAwarded, round.standing, round.result);
      setPhase("over");
      return;
    }
    setRound(null);
    setBotAnswered(false);
    setIndex(index + 1);
    beginQuestion();
  };

  // ============ LOBBY ============
  if (phase === "lobby") {
    return (
      <div className="px-5 pt-6 pb-10 lg:mx-auto lg:max-w-2xl">
        <div className="mb-1 flex items-center gap-2">
          <Swords size={16} className="text-violet-400" aria-hidden />
          <span className="text-xs font-bold tracking-wide text-violet-400 uppercase">Duelo</span>
        </div>
        <h1 className="mb-1 text-2xl font-black tracking-tight">Liga de Cibersegurança</h1>
        <p className="mb-5 text-sm text-neutral-400">
          Cinco perguntas, 15 segundos cada. Quem responde certo e rápido pontua mais.
        </p>

        {/* Classificação atual — acumulada na sessão */}
        <div className="mb-4 rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              <span
                className={`absolute h-full w-full rounded-2xl blur-lg ${
                  status.tier.accent === "gold"
                    ? "bg-amber-400/25"
                    : status.tier.accent === "silver"
                      ? "bg-neutral-300/20"
                      : status.tier.accent === "diamond"
                        ? "bg-cyan-300/25"
                        : "bg-orange-700/25"
                }`}
                aria-hidden
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-neutral-700 bg-neutral-950">
                <Shield
                  size={26}
                  className={
                    status.tier.accent === "gold"
                      ? "text-amber-300"
                      : status.tier.accent === "silver"
                        ? "text-neutral-200"
                        : status.tier.accent === "diamond"
                          ? "text-cyan-300"
                          : "text-orange-400"
                  }
                  aria-hidden
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] tracking-widest text-neutral-500 uppercase">
                Sua classificação
              </div>
              <div className="text-xl font-black tracking-tight">{status.tier.name}</div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
                <span>{league.points} pontos de liga</span>
                <span>
                  {status.next ? `faltam ${status.toNext} para ${status.next.name}` : "faixa máxima"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-neutral-800 pt-3 text-center">
            <div>
              <div className="text-sm font-black">#{position.rank}</div>
              <div className="text-[9px] tracking-wider text-neutral-500 uppercase">Global</div>
            </div>
            <div>
              <div className="text-sm font-black text-emerald-400">{league.wins}</div>
              <div className="text-[9px] tracking-wider text-neutral-500 uppercase">Vitórias</div>
            </div>
            <div>
              <div className="text-sm font-black text-neutral-300">{league.draws}</div>
              <div className="text-[9px] tracking-wider text-neutral-500 uppercase">Empates</div>
            </div>
            <div>
              <div className="text-sm font-black text-red-400">{league.losses}</div>
              <div className="text-[9px] tracking-wider text-neutral-500 uppercase">Derrotas</div>
            </div>
          </div>
        </div>

        {/* Quadro de líderes (fictício) */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-neutral-800">
          <div className="border-b border-neutral-800 bg-neutral-900/60 px-4 py-2 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
            Quadro da liga
          </div>
          {position.board.map((row, i) => (
            <div
              key={row.name + i}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                row.you ? "bg-violet-500/10" : "bg-neutral-950/40"
              } ${i > 0 ? "border-t border-neutral-900" : ""}`}
            >
              <span className="w-5 shrink-0 text-[11px] font-bold text-neutral-500 tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-xs font-bold ${row.you ? "text-violet-200" : ""}`}>
                  {row.name}
                  {row.you && (
                    <span className="ml-1.5 rounded bg-violet-500/25 px-1 text-[9px] font-black text-violet-200">
                      VOCÊ
                    </span>
                  )}
                </div>
                <div className="truncate text-[10px] text-neutral-500">{row.unit}</div>
              </div>
              <span className="shrink-0 text-xs font-black tabular-nums">{row.points}</span>
            </div>
          ))}
        </div>

        {failed && (
          <div role="alert" className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200">
            Não foi possível abrir a partida. Tente novamente.
          </div>
        )}

        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { v: "100+", l: "pontos por acerto", c: "text-emerald-400" },
            { v: "+60", l: "bônus de velocidade", c: "text-violet-400" },
            { v: "5", l: "perguntas por partida", c: "text-neutral-200" },
          ].map((k) => (
            <div key={k.l} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
              <div className={`text-xl font-black ${k.c}`}>{k.v}</div>
              <div className="mt-0.5 text-[11px] leading-tight text-neutral-500">{k.l}</div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void startMatch()}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 py-4 text-sm font-black text-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
        >
          <Swords size={16} aria-hidden /> Procurar oponente
        </button>
        <button
          type="button"
          onClick={onExit}
          className="w-full text-center text-xs text-neutral-500 transition-colors hover:text-neutral-300"
        >
          ← Voltar para a trilha
        </button>

        <p className="mt-6 text-[11px] leading-relaxed text-neutral-600">
          Os adversários são simulados (bots) e identificados como tal. Placar, pontuação e
          classificação são calculados no servidor.
        </p>
      </div>
    );
  }

  // ============ PROCURANDO ============
  if (phase === "matching") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500/25" />
          <span className="absolute inline-flex h-20 w-20 animate-pulse rounded-full bg-violet-500/20" />
          <Swords size={32} className="relative text-violet-300" aria-hidden />
        </div>
        <div className="mb-1 text-lg font-black tracking-widest uppercase">Procurando oponente</div>
        <p className="text-center text-xs text-neutral-500">
          Buscando alguém com classificação parecida com a sua
        </p>
      </div>
    );
  }

  // ============ OPONENTE ENCONTRADO ============
  if (phase === "found" && match) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12">
        <div aria-hidden className="pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 right-1/4 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="bq-flow-node relative mb-10 text-center">
          <div className="text-[11px] font-black tracking-[0.35em] text-emerald-400 uppercase">
            Oponente encontrado
          </div>
        </div>

        <div className="relative flex w-full max-w-md items-start justify-between gap-4">
          <Fighter
            initials={playerInitials}
            name={playerName.trim() || "Você"}
            handle="você"
            tier={status.tier.name}
            accent="emerald"
          />
          <div className="order-2 flex flex-col items-center pt-6">
            <span className="text-2xl font-black tracking-tighter text-neutral-500">VS</span>
          </div>
          <Fighter
            initials={match.opponent.avatar}
            name={match.opponent.name}
            handle={match.opponent.handle}
            tier={match.opponent.tier}
            accent="violet"
            align="right"
          />
        </div>

        <div className="mt-10 flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1.5">
          <span className="rounded bg-neutral-800 px-1.5 text-[9px] font-black text-neutral-400">BOT</span>
          <span className="text-[11px] text-neutral-400">{match.opponent.unit}</span>
        </div>
      </div>
    );
  }

  const question = match?.questions[index];

  // ============ RESULTADO E CLASSIFICAÇÃO ============
  if (phase === "over" && round && match) {
    const win = round.result === "win";
    const draw = round.result === "draw";
    const st = round.standing;
    return (
      <div className="flex flex-1 flex-col px-5 pt-6 pb-10 lg:mx-auto lg:max-w-2xl">
        <div className="mb-1 text-center text-[11px] font-black tracking-[0.3em] text-neutral-500 uppercase">
          Sua classificação
        </div>

        <div
          className={`mb-4 rounded-3xl border p-6 text-center ${
            win
              ? "border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-transparent"
              : draw
                ? "border-neutral-700 bg-neutral-900/60"
                : "border-orange-500/40 bg-gradient-to-b from-orange-500/10 to-transparent"
          }`}
        >
          <div className="mb-3 flex justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span
                className={`absolute h-full w-full rounded-2xl blur-xl ${
                  win ? "bg-emerald-500/25" : "bg-neutral-500/15"
                }`}
                aria-hidden
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-neutral-600 bg-neutral-950">
                <Shield size={34} className={win ? "text-emerald-300" : "text-neutral-300"} aria-hidden />
              </div>
            </div>
          </div>

          <div className="text-3xl font-black tracking-tight">{st?.tier ?? "Bronze III"}</div>
          <div className="mt-1 mb-3 text-[11px] tracking-wider text-neutral-500 uppercase">
            {win ? "Vitória" : draw ? "Empate" : "Derrota"} · {round.hits.you}/{match.total} acertos
          </div>

          {st && (
            <>
              <div className="mx-auto mb-1 h-1.5 w-48 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                  style={{ width: `${st.progress}%` }}
                />
              </div>
              <div className="text-[11px] font-bold text-amber-300">
                Melhor que {st.percentile}% dos jogadores · {st.points} pontos
              </div>
            </>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 text-center">
            <div className="text-[10px] tracking-wider text-neutral-500 uppercase">Ranking global</div>
            <div className="text-xl font-black">#{st?.globalRank ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-3 text-center">
            <div className="text-[10px] tracking-wider text-violet-300 uppercase">Na sua unidade</div>
            <div className="text-xl font-black text-violet-200">#{st?.unitRank ?? "—"}</div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="text-center">
            <div className="text-2xl font-black text-emerald-400">{scores.you}</div>
            <div className="text-[10px] tracking-wider text-neutral-500 uppercase">Seus pontos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-red-400">{scores.opponent}</div>
            <div className="text-[10px] tracking-wider text-neutral-500 uppercase">Oponente</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-neutral-200">{st?.accuracy ?? 0}%</div>
            <div className="text-[10px] tracking-wider text-neutral-500 uppercase">Precisão</div>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-center gap-4 text-center">
          <span className="font-bold text-violet-300">+{round.xpAwarded} pontos GRC</span>
          <span className="text-neutral-700">·</span>
          <span className="font-bold text-amber-300">+{st?.delta ?? 0} pontos de liga</span>
        </div>

        {round.review.length > 0 && (
          <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black tracking-widest text-amber-300 uppercase">
              <BookOpen size={11} aria-hidden /> Para revisar
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
              Os verbetes abaixo respondem exatamente as perguntas que você errou.
            </p>
            <div className="flex flex-wrap gap-2">
              {round.review.map((id) => {
                const entry = CYBERPEDIA.find((a) => a.id === id);
                if (!entry) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onOpenArticle(id)}
                    className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[11px] font-bold text-neutral-200 transition-all duration-300 hover:scale-105 hover:border-violet-500/60 hover:text-violet-200"
                  >
                    {entry.title} →
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setPhase("lobby");
            setMatch(null);
            setRound(null);
            setScores({ you: 0, opponent: 0 });
          }}
          className="mb-3 w-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
        >
          Jogar de novo
        </button>
        <button
          type="button"
          onClick={onExit}
          className="w-full text-center text-xs text-neutral-500 transition-colors hover:text-neutral-300"
        >
          ← Voltar para a trilha
        </button>
      </div>
    );
  }

  if (!match || !question) return null;

  // ============ ARENA ============
  const urgent = ratio <= 0.3;
  // 0x0 divide a barra ao meio; sem isso o lado do oponente ocupava tudo
  const sum = scores.you + scores.opponent;
  const youShare = sum === 0 ? 50 : (scores.you / sum) * 100;

  return (
    <div className="flex flex-1 flex-col px-4 pt-4 pb-8 lg:mx-auto lg:max-w-2xl">
      {/* HUD dos dois lados */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/10 text-[11px] font-black text-emerald-300">
            {playerInitials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold">{playerName.trim() || "Você"}</div>
            <div className="text-sm font-black text-emerald-400 tabular-nums">{scores.you}</div>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1 text-center">
          <div className="text-[9px] tracking-wider text-neutral-500 uppercase">Rodada</div>
          <div className="text-sm font-black tabular-nums">
            {index + 1}/{match.total}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="min-w-0 text-right">
            <div className="flex items-center justify-end gap-1">
              <span className="truncate text-xs font-bold">{match.opponent.name}</span>
              <span className="shrink-0 rounded bg-neutral-800 px-1 text-[8px] font-black text-neutral-400">
                BOT
              </span>
            </div>
            <div className="text-sm font-black text-violet-400 tabular-nums">{scores.opponent}</div>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-400/60 bg-violet-500/10 text-[11px] font-black text-violet-300">
            {match.opponent.avatar}
          </div>
        </div>
      </div>

      {/* barra de domínio: quem está à frente ocupa mais espaço */}
      <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
          style={{ width: `${youShare}%` }}
        />
        <div className="h-full flex-1 bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700" />
      </div>

      {/* cronômetro */}
      <div className="mb-4">
        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              urgent ? "bg-red-500" : "bg-neutral-400"
            }`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
          <span>
            {botAnswered && !round ? (
              <span className="font-bold text-violet-300">oponente respondeu</span>
            ) : (
              "aguardando sua resposta"
            )}
          </span>
          <span className={`font-bold tabular-nums ${urgent ? "text-red-400" : ""}`}>
            {(remaining / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* card da pergunta */}
      <div className="mb-4 rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 p-5 text-center">
        <span className="mb-3 inline-block rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[9px] font-black tracking-widest text-violet-300 uppercase">
          {question.category}
        </span>
        <h2 className="text-base leading-snug font-black tracking-tight">{question.prompt}</h2>
      </div>

      {/* respostas em grade */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.options.map((option) => {
          const revealed = round !== null;
          const isRight = revealed && option.id === round.correctOptionId;
          const isMine = revealed && answers[index]?.optionId === option.id;
          const isBot = revealed && round.bot.optionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={busy || revealed}
              onClick={() => submitRef.current(option.id)}
              className={`relative rounded-xl border px-4 py-4 text-center text-sm font-bold transition-all duration-300 disabled:cursor-default ${
                isRight
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                  : isMine
                    ? "border-red-500/60 bg-red-500/10 text-red-200"
                    : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:scale-[1.02] hover:border-neutral-500 hover:bg-neutral-800"
              }`}
            >
              {option.label}
              {revealed && (isMine || isBot) && (
                <span className="absolute top-1.5 right-2 flex gap-1">
                  {isMine && (
                    <span className="rounded bg-emerald-500/20 px-1 text-[8px] font-black text-emerald-300">
                      VOCÊ
                    </span>
                  )}
                  {isBot && (
                    <span className="rounded bg-violet-500/20 px-1 text-[8px] font-black text-violet-300">
                      BOT
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {round && (
        <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="mb-3 text-xs leading-relaxed text-neutral-300">{round.explanation}</p>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className={round.correct ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
              você {round.correct ? "acertou" : "errou"}
            </span>
            <span className="text-neutral-600">·</span>
            <span className={round.bot.correct ? "text-emerald-400" : "text-red-400"}>
              {match.opponent.name} {round.bot.correct ? "acertou" : "errou"} em{" "}
              {(round.bot.ms / 1000).toFixed(1)}s
            </span>
          </div>

          {/* a resposta completa está na CyberPedia */}
          {CYBERPEDIA.find((a) => a.id === round.article) && (
            <div className="mb-3 flex items-center gap-1.5 text-[11px] text-neutral-500">
              <BookOpen size={11} className="shrink-0 text-violet-400" aria-hidden />
              <span>
                Esta pergunta está explicada em{" "}
                <span className="font-semibold text-violet-300">
                  {CYBERPEDIA.find((a) => a.id === round.article)?.title}
                </span>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={nextQuestion}
            className="w-full rounded-full bg-neutral-200 py-3 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-95"
          >
            {round.finished ? "Ver classificação" : "Próxima rodada"}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PORTAL CORPORATIVO — porta de entrada do painel executivo
// ============================================================

/**
 * Código de demonstração. Em produção esta tela não existe: o acesso
 * vem do SSO corporativo e a autorização é por papel no diretório.
 * A tela existe para tornar VISÍVEL que o painel é área restrita —
 * na versão anterior ele era um crachá ao lado dos demais, o que dava
 * a entender que qualquer colaborador entra no painel da diretoria.
 */

const DEMO_ACCESS_CODE = "SOC-2026";

function CorporatePortal({
  onAuthenticated,
  onCancel,
}: {
  onAuthenticated: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(DEMO_ACCESS_CODE);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = () => {
    if (code.trim().toUpperCase() !== DEMO_ACCESS_CODE) {
      setError(true);
      return;
    }
    setChecking(true);
    onAuthenticated();
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-black px-5 py-10 font-sans text-white">
      <div className="relative w-full max-w-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-600/15 blur-3xl"
        />

        <div className="relative rounded-3xl border border-neutral-800 bg-neutral-950/80 p-6 backdrop-blur sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20">
              <Lock size={20} className="text-violet-200" aria-hidden />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-widest text-violet-400 uppercase">
                Área restrita
              </div>
              <h1 className="text-lg font-black tracking-tight">Acesso corporativo</h1>
            </div>
          </div>

          <p className="mb-6 text-xs leading-relaxed text-neutral-400">
            O painel de risco consolida dados de todas as unidades e é restrito à liderança de
            segurança. Em produção, o acesso vem do SSO corporativo com autorização por papel no
            Active Directory.
          </p>

          <label
            htmlFor="bq-code"
            className="mb-2 block text-xs font-semibold tracking-wide text-neutral-500 uppercase"
          >
            Código de acesso
          </label>
          <input
            id="bq-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            autoComplete="off"
            spellCheck={false}
            className={`mb-2 w-full rounded-xl border bg-neutral-900 px-4 py-3 font-mono text-sm tracking-widest transition-colors outline-none ${
              error
                ? "border-red-500/60 text-red-300"
                : "border-neutral-800 focus:border-violet-500"
            }`}
          />
          {error ? (
            <p role="alert" className="mb-5 text-[11px] text-red-300">
              Código inválido. Tentativas de acesso ao painel são registradas.
            </p>
          ) : (
            <p className="mb-5 text-[11px] text-neutral-600">
              Ambiente de demonstração — código preenchido automaticamente.
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-400 to-violet-300 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-40"
          >
            <ChartNoAxesColumn size={16} aria-hidden /> Entrar no painel
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="mt-4 w-full text-center text-xs text-neutral-500 transition-colors hover:text-neutral-300"
          >
            ← Voltar para o aplicativo do colaborador
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BIBLIOTECA PÚBLICA — CyberPedia sem crachá
// ============================================================

function PublicLibrary({
  view,
  article,
  onOpenArticle,
  onBackToList,
  onExit,
}: {
  view: View;
  article: Article | null;
  onOpenArticle: (id: string) => void;
  onBackToList: () => void;
  onExit: () => void;
}) {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-black font-sans text-white">
      <div className="relative flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-black lg:max-w-3xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl"
        />

        <header className="relative z-20 flex items-center justify-between border-b border-neutral-900 bg-black/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500">
              <Shield size={16} strokeWidth={2.5} aria-hidden />
            </div>
            <span className="text-sm font-black tracking-tight">ByteQuest</span>
            <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-violet-300 uppercase">
              Acesso livre
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              <ArrowLeft size={13} aria-hidden /> Início
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-3 py-1.5 text-xs font-bold text-black transition-all hover:scale-105"
            >
              Entrar
            </button>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
          {view === "article" && article ? (
            <ArticleView article={article} onBack={onBackToList} />
          ) : (
            <CyberPediaList onOpen={onOpenArticle} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DIAGNÓSTICO — questionário que compõe a trilha personalizada
// ============================================================

function DiagnosticScreen({
  onReady,
  onCancel,
  hasTrack,
}: {
  onReady: (plan: TrackPlanResponse) => void;
  onCancel: () => void;
  hasTrack: boolean;
}) {
  const [questions, setQuestions] = useState<PublicAssessmentQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/trilha", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ questions: PublicAssessmentQuestion[] }>;
      })
      .then((data) => setQuestions(data.questions))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const submit = useCallback(
    async (answers: Record<string, string>) => {
      setSubmitting(true);
      try {
        const response = await fetch("/api/trilha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: Object.entries(answers).map(([questionId, optionId]) => ({
              questionId,
              optionId,
            })),
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        onReady((await response.json()) as TrackPlanResponse);
      } catch {
        setFailed(true);
      } finally {
        setSubmitting(false);
      }
    },
    [onReady],
  );

  if (failed) {
    return (
      <div className="px-5 py-8">
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200"
        >
          Não foi possível montar a trilha. Recarregue a página para tentar de novo.
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          ← Escolher outro crachá
        </button>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="flex flex-col gap-3 px-5 py-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60"
          />
        ))}
      </div>
    );
  }

  const question = questions[index];
  const total = questions.length;

  const choose = (optionId: string) => {
    const next = { ...picks, [question.id]: optionId };
    setPicks(next);
    if (index + 1 < total) {
      setIndex(index + 1);
      return;
    }
    void submit(next);
  };

  return (
    <div className="flex flex-1 flex-col px-5 pt-6 pb-8">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles size={15} className="text-violet-400" aria-hidden />
        <span className="text-xs font-bold tracking-wide text-violet-400 uppercase">
          Diagnóstico
        </span>
      </div>
      <h1 className="mb-1 text-2xl font-black tracking-tight">Vamos montar sua trilha</h1>
      <p className="mb-5 text-xs leading-relaxed text-neutral-400">
        Sete perguntas sobre sua rotina. A trilha é montada por regras explícitas — cada um dos 10
        módulos vem acompanhado do motivo pelo qual foi escolhido para você.
      </p>

      {/* progresso do questionário */}
      <div className="mb-6 flex items-center gap-1.5">
        {questions.map((item, position) => (
          <div
            key={item.id}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              position < index
                ? "bg-emerald-500/70"
                : position === index
                  ? "bg-violet-400"
                  : "bg-neutral-800"
            }`}
          />
        ))}
      </div>

      <div className="mb-1 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
        Pergunta {index + 1} de {total}
      </div>
      <h2 className="mb-1 text-lg leading-snug font-black tracking-tight">{question.prompt}</h2>
      {question.help && <p className="mb-5 text-xs text-neutral-500">{question.help}</p>}

      <div className="flex flex-col gap-2.5">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={submitting}
            onClick={() => choose(option.id)}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3.5 text-left text-sm font-semibold text-neutral-300 transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/60 hover:bg-neutral-800 active:scale-95 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none disabled:opacity-40"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-6 lg:mt-8">
        <button
          type="button"
          onClick={index === 0 ? onCancel : () => setIndex(index - 1)}
          className="text-xs text-neutral-500 transition-colors hover:text-neutral-300"
        >
          {index === 0 ? (hasTrack ? "← Manter a trilha atual" : "← Escolher outro crachá") : "← Voltar"}
        </button>
        {submitting && <span className="text-xs text-violet-300">Montando sua trilha…</span>}
      </div>
    </div>
  );
}

// ============================================================
// PAINEL CISO / SOC
// ============================================================

/** Evento do Live Threat Feed — chega com timestamp absoluto. */
interface LiveEvent {
  id: string;
  at: number;
  text: string;
  severity: RiskLevel;
  /** true quando o evento veio da sessão do próprio avaliador */
  local?: boolean;
}

const LIVE_ACTIONS: Array<{ template: string; severity: RiskLevel }> = [
  { template: "Tentativa de phishing bloqueada no gateway — setor {setor}", severity: "medio" },
  { template: "Colaborador reportou {vetor} pelo canal oficial — {setor}", severity: "baixo" },
  { template: "Credencial reutilizada detectada em base vazada — {setor}", severity: "alto" },
  { template: "Domínio typosquatting enviado para derrubada — impacto em {setor}", severity: "medio" },
  { template: "Dispositivo USB desconhecido recusado em terminal — {setor}", severity: "medio" },
  { template: "Prompt com PII barrado pelo filtro de DLP — {setor}", severity: "alto" },
  { template: "Push de MFA negado pelo colaborador — possível fadiga de MFA em {setor}", severity: "critico" },
  { template: "Acesso a ferramenta não homologada bloqueado — {setor}", severity: "medio" },
];

function CisoDashboard({ progress }: { progress: Record<SectorId, SectorProgress> }) {
  const [snapshot, setSnapshot] = useState<GrcSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState<LiveEvent[]>([]);
  const [clock, setClock] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);
  const tick = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/grc", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<GrcSnapshot>;
      })
      .then(setSnapshot)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, []);

  // relógio do feed: só atualiza os rótulos "há X"
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // barras entram animadas de 0 até o valor real
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(id);
  }, []);

  // Live Threat Feed: um evento novo a cada 4s, montado a partir dos
  // setores reais do snapshot — os mais expostos aparecem mais vezes.
  useEffect(() => {
    if (!snapshot) return;
    const pool = snapshot.sectors.flatMap((sectorRisk) =>
      Array.from({ length: sectorRisk.riskScore >= 55 ? 3 : 1 }, () => sectorRisk),
    );

    const emit = () => {
      const target = pool[tick.current % pool.length];
      const action = LIVE_ACTIONS[tick.current % LIVE_ACTIONS.length];
      tick.current += 1;
      setLive((currentEvents) =>
        [
          {
            id: `live-${tick.current}-${Date.now()}`,
            at: Date.now(),
            severity: action.severity,
            text: action.template
              .replace("{setor}", target.label)
              .replace("{vetor}", target.topVector),
          },
          ...currentEvents,
        ].slice(0, 8),
      );
    };

    emit();
    const id = setInterval(emit, 4000);
    return () => clearInterval(id);
  }, [snapshot]);

  if (failed) {
    return (
      <div className="px-5 py-8">
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200"
        >
          Não foi possível carregar a telemetria. Recarregue a página.
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex flex-col gap-3 px-5 py-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60"
          />
        ))}
      </div>
    );
  }

  // ---- impacto da sessão local sobre a telemetria ----
  // Cada erro do avaliador nas trilhas sobe o risco da unidade dele.
  // É o que conecta o jogo ao painel: a demo deixa de ser um mockup.
  const localFailures = Object.values(progress).reduce((sum, entry) => sum + entry.failures, 0);
  const localXp = Object.values(progress).reduce((sum, entry) => sum + entry.xp, 0);

  const sectors = snapshot.sectors
    .map((item) => {
      const failures = progress[item.sectorId]?.failures ?? 0;
      const xpCredit = Math.min(6, Math.floor((progress[item.sectorId]?.xp ?? 0) / 300));
      const riskScore = Math.max(
        5,
        Math.min(98, item.riskScore + failures * 3 - xpCredit),
      );
      return {
        ...item,
        riskScore,
        level: riskScore >= 75 ? "critico" : riskScore >= 55 ? "alto" : riskScore >= 35 ? "medio" : "baixo",
        resilience: Math.max(20, Math.min(99, item.resilience - failures * 2 + xpCredit)),
        localFailures: failures,
      } as SectorRisk & { localFailures: number };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const worst = sectors[0];

  const localEvents: LiveEvent[] = localFailures
    ? [
        {
          id: "local-session",
          at: clock,
          severity: localFailures > 3 ? "alto" : "medio",
          local: true,
          text: `Sessão em andamento: ${localFailures} falha(s) em simulação — risco recalculado nas unidades afetadas`,
        },
      ]
    : [];

  const feed = [...localEvents, ...live];

  return (
    <div className="px-5 pt-6 pb-12">
      <div className="mb-1 flex items-center gap-2">
        <RadioTower size={15} className="text-violet-400" aria-hidden />
        <span className="text-xs font-bold tracking-wide text-violet-400 uppercase">
          Painel executivo
        </span>
      </div>
      <h1 className="text-2xl font-black tracking-tight">Postura de risco humano</h1>
      <p className="mb-5 text-xs text-neutral-500">
        Janela de {snapshot.windowDays} dias · {snapshot.kpis.activeEmployees.toLocaleString("pt-BR")}{" "}
        colaboradores ativos
      </p>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={GaugeCircle}
          tone="emerald"
          value={`${Math.max(20, snapshot.kpis.humanResilience - localFailures)}%`}
          label="Taxa de resiliência humana"
          delta={
            localFailures > 0
              ? `−${localFailures} p.p. pela sua sessão`
              : `+${snapshot.kpis.resilienceDelta} p.p. vs. ciclo anterior`
          }
        />
        <KpiCard
          icon={ShieldCheck}
          tone="violet"
          value={(snapshot.kpis.mitigatedIncidents + Math.floor(localXp / 50)).toLocaleString("pt-BR")}
          label="Incidentes mitigados"
          delta="Simulações reportadas ou recusadas"
        />
        <KpiCard
          icon={Clock}
          tone="neutral"
          value={`${snapshot.kpis.reportRateMinutes} min`}
          label="Tempo médio de reporte"
          delta="Da exposição ao canal oficial"
        />
        <KpiCard
          icon={Users}
          tone="neutral"
          value={`${snapshot.kpis.trainingCoverage}%`}
          label="Cobertura da trilha"
          delta="Colaboradores com ciclo em dia"
        />
      </div>

      {/* Heatmap por setor */}
      <SectionHeader
        icon={Activity}
        title="Mapa de risco por unidade"
        caption={`Maior exposição: ${worst.label} (${RISK_STYLES[worst.level].label})`}
      />
      <div className="mb-6 flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
        {sectors.map((item, position) => (
          <RiskCard
            key={item.sectorId}
            risk={item}
            history={snapshot.history[item.sectorId] ?? [item.riskScore]}
            mounted={mounted}
            delayIndex={position}
          />
        ))}
      </div>

      {/* Threat intel */}
      {/* ---- Live Threat Feed ---- */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Radar size={14} className="text-violet-400" aria-hidden />
          Live threat feed
        </h2>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          AO VIVO
        </span>
      </div>
      <div className="mb-6 flex flex-col gap-2 border-l border-neutral-800 pl-3">
        {feed.length === 0 && (
          <p className="py-4 text-[11px] text-neutral-600">Aguardando eventos do coletor…</p>
        )}
        {feed.map((event) => (
          <LiveEventRow key={event.id} event={event} clock={clock} />
        ))}
      </div>

      {/* ---- Consolidado do período ---- */}
      <SectionHeader
        icon={RadioTower}
        title="Consolidado do período"
        caption={`Vetores simulados que geraram falha nos últimos ${snapshot.windowDays} dias`}
      />
      <div className="mb-6 flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
        {snapshot.feed.slice(0, 5).map((event) => (
          <ThreatCard key={event.id} event={event} />
        ))}
      </div>

      {/* ---- O que fazer com o dado ---- */}
      <SectionHeader
        icon={ListChecks}
        title="Ações recomendadas"
        caption="Derivadas do ranking de risco — mudou a ordem, muda a recomendação"
      />
      <div className="mb-6 flex flex-col gap-2.5">
        {snapshot.actions.map((action) => (
          <div
            key={action.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 transition-colors hover:border-neutral-700"
          >
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <span className="min-w-0 text-sm font-bold">{action.title}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  action.priority === "alta"
                    ? "border-red-500/40 bg-red-500/15 text-red-300"
                    : "border-amber-500/40 bg-amber-500/15 text-amber-300"
                }`}
              >
                {action.priority === "alta" ? "Prioridade alta" : "Prioridade média"}
              </span>
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-neutral-400">{action.detail}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-neutral-800 pt-2 text-[10px] text-neutral-500">
              <span>
                Responsável: <span className="text-neutral-300">{action.owner}</span>
              </span>
              <span>
                Prazo: <span className="text-neutral-300">{action.due}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Comparativo com o setor ---- */}
      <SectionHeader
        icon={Scale}
        title="Comparativo com o setor"
        caption="Referências públicas do varejo, para situar os nossos números"
      />
      <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-800">
        {snapshot.benchmarks.map((item, index) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 p-3.5 ${
              index > 0 ? "border-t border-neutral-800" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] leading-snug font-semibold text-neutral-300">
                {item.label}
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-500">{item.source}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-black text-violet-300">{item.ours}</div>
              <div className="text-[10px] text-neutral-500">setor: {item.market}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
          <Info size={11} aria-hidden /> Sobre estes dados
        </p>
        <p className="text-[11px] leading-relaxed text-neutral-500">
          Telemetria simulada para demonstração, agregada por unidade de negócio. O painel nunca
          expõe qual colaborador falhou — a métrica é a resiliência da organização, e essa
          separação é o que sustenta a adesão ao treinamento. Na integração com o SOC, a mesma
          estrutura recebe os vetores reais observados em produção.
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  tone,
  value,
  label,
  delta,
}: {
  icon: LucideIcon;
  tone: "emerald" | "violet" | "neutral";
  value: string;
  label: string;
  delta: string;
}) {
  const color =
    tone === "emerald" ? "text-emerald-400" : tone === "violet" ? "text-violet-400" : "text-neutral-400";

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3.5">
      <Icon size={15} className={`mb-2 ${color}`} aria-hidden />
      <div className="text-xl leading-none font-black">{value}</div>
      <div className="mt-1.5 text-[11px] leading-tight font-semibold text-neutral-300">{label}</div>
      <div className="mt-1 text-[10px] leading-tight text-neutral-500">{delta}</div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  caption,
}: {
  icon: LucideIcon;
  title: string;
  caption: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-1.5 text-sm font-bold">
        <Icon size={14} className="text-violet-400" aria-hidden />
        {title}
      </h2>
      <p className="mt-0.5 text-[11px] text-neutral-500">{caption}</p>
    </div>
  );
}

function LiveEventRow({ event, clock }: { event: LiveEvent; clock: number }) {
  const seconds = Math.max(0, Math.floor((clock - event.at) / 1000));
  const stamp =
    seconds < 60 ? `há ${seconds}s` : `há ${Math.floor(seconds / 60)} min`;
  const style = RISK_STYLES[event.severity];

  return (
    <div className="bq-feed-item relative py-1.5 pl-3">
      <span
        className={`absolute top-3 -left-[7px] h-2.5 w-2.5 rounded-full ring-4 ring-black ${style.dot}`}
        aria-hidden
      />
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 font-mono text-[10px] text-neutral-500 tabular-nums">{stamp}</span>
        {event.local && (
          <span className="shrink-0 rounded bg-violet-500/20 px-1.5 text-[9px] font-bold text-violet-300">
            SESSÃO
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs leading-snug text-neutral-300">{event.text}</p>
    </div>
  );
}

/** Mini gráfico de barras — 6 semanas de índice de risco. */
function TrendBars({ series, tone }: { series: number[]; tone: string }) {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {series.map((value, index) => (
        <div
          key={index}
          className={`flex-1 rounded-sm transition-all duration-500 ${
            index === series.length - 1 ? tone : "bg-neutral-700"
          }`}
          style={{ height: `${Math.max(12, value)}%` }}
        />
      ))}
    </div>
  );
}

function RiskCard({
  risk,
  history,
  mounted,
  delayIndex,
}: {
  risk: SectorRisk & { localFailures?: number };
  history: number[];
  mounted: boolean;
  delayIndex: number;
}) {
  const style = RISK_STYLES[risk.level];
  const TrendIcon = risk.trend === "up" ? TrendingUp : risk.trend === "down" ? TrendingDown : Minus;
  const trendColor =
    risk.trend === "up" ? "text-red-400" : risk.trend === "down" ? "text-emerald-400" : "text-neutral-500";

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all duration-300 hover:border-neutral-700 hover:bg-neutral-900">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
            <span className="truncate text-sm font-bold">{risk.label}</span>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-neutral-500">
            {risk.headcount.toLocaleString("pt-BR")} pessoas
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <TrendIcon size={13} className={trendColor} aria-hidden />
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>
            {style.label}
          </span>
        </div>
      </div>

      <div
        className="mb-2 h-2 w-full overflow-hidden rounded-full bg-neutral-800"
        role="img"
        aria-label={`Índice de risco ${risk.riskScore} de 100`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${style.bar}`}
          style={{
            width: mounted ? `${risk.riskScore}%` : "0%",
            transitionDelay: `${delayIndex * 80}ms`,
          }}
        />
      </div>

      <div className="mb-3 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <TrendBars series={history} tone={style.bar} />
          <div className="mt-1 flex justify-between text-[9px] text-neutral-600">
            <span>6 semanas atrás</span>
            <span>agora</span>
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-[10px] text-neutral-500">
        <span>Índice de risco {risk.riskScore}/100</span>
        <span>
          Resiliência {risk.resilience}% · cobertura {risk.coverage}%
        </span>
      </div>

      <div className="flex items-start gap-1.5 border-t border-neutral-800 pt-2 text-[11px] text-neutral-400">
        <AlertTriangle size={11} className="mt-0.5 shrink-0 text-orange-400" aria-hidden />
        <span>
          Vetor dominante: <span className="text-neutral-200">{risk.topVector}</span>
        </span>
      </div>

      {risk.localFailures ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2 py-1.5 text-[10px] font-semibold text-violet-300">
          <Zap size={10} aria-hidden />
          +{risk.localFailures * 3} pts de risco por falhas registradas nesta sessão
        </div>
      ) : null}
    </div>
  );
}

function ThreatCard({ event }: { event: ThreatEvent }) {
  const style = RISK_STYLES[event.severity];
  const failRate = Math.round((event.failed / event.simulated) * 100);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <span className="min-w-0 text-sm font-bold">{event.vector}</span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.chip}`}
        >
          {style.label}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        <span className="font-semibold text-neutral-300">{event.sectorLabel}</span>
        <span>{relativeDay(event.daysAgo)}</span>
        <span>
          {event.failed.toLocaleString("pt-BR")} falhas em{" "}
          {event.simulated.toLocaleString("pt-BR")} simulações
        </span>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-800">
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${failRate}%` }} />
        </div>
        <span className="shrink-0 text-[10px] font-bold text-neutral-400">{failRate}% falha</span>
      </div>

      <p className="text-[11px] leading-relaxed text-neutral-500">{event.note}</p>
    </div>
  );
}

// ============================================================
// MAPA DE MISSÕES — progressão vertical
// ============================================================

function MissionMap({
  name,
  sectorLabel,
  sectorIcon,
  custom,
  missions,
  statusOf,
  loading,
  error,
  xp,
  streak,
  reviewCount,
  onOpen,
}: {
  name: string;
  sectorLabel: string;
  sectorIcon: SectorIconName;
  custom: TrackPlanResponse | null;
  missions: PublicMission[];
  statusOf: (index: number, missionId: string) => MissionStatus;
  loading: boolean;
  error: boolean;
  xp: number;
  streak: number;
  reviewCount: number;
  onOpen: (missionId: string) => void;
}) {
  const Icon = SECTOR_ICONS[sectorIcon];
  const doneCount = missions.filter((m, i) => statusOf(i, m.id) !== "current" && statusOf(i, m.id) !== "locked").length;
  const pct = missions.length > 0 ? Math.round((doneCount / missions.length) * 100) : 0;

  return (
    <div className="px-5 pt-6 pb-10">
      <div className="mb-1 text-xs text-neutral-500">Olá,</div>
      <h1 className="mb-4 text-2xl font-black tracking-tight">{name}</h1>

      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            <Icon size={13} className="text-emerald-400" aria-hidden /> Trilha {sectorLabel}
          </span>
          <span className="text-xs font-bold text-emerald-400">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
          <span>
            {doneCount} de {missions.length} módulos
          </span>
          <span className="flex items-center gap-1 text-violet-400">
            <Star size={11} aria-hidden /> {xp} XP nesta trilha
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            <Flame size={11} aria-hidden /> {streak}
          </span>
          {reviewCount > 0 && <span className="text-amber-300">{reviewCount} para revisar</span>}
        </div>
      </div>

      {custom && (
        <div className="mb-6 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-emerald-500/10 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-violet-300 uppercase">
            <Sparkles size={11} aria-hidden /> Seu perfil de risco
          </div>
          <div className="mb-3 flex flex-col gap-1.5">
            {custom.profile.slice(0, 4).map((item) => {
              const max = custom.profile[0]?.score || 1;
              return (
                <div key={item.tag} className="flex items-center gap-2">
                  <span className="w-36 shrink-0 truncate text-[11px] text-neutral-300">
                    {item.label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                      style={{ width: `${Math.round((item.score / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            Trilha montada a partir do seu diagnóstico, com base em{" "}
            <span className="text-neutral-200">{custom.baseSectorLabel}</span>. Cada módulo abaixo
            traz o motivo pelo qual entrou.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200"
        >
          Não foi possível carregar a trilha. Recarregue a página para tentar de novo.
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60"
            />
          ))}
        </div>
      )}

      <ol className="flex flex-col">
        {missions.map((mission, index) => (
          <MissionNode
            key={mission.id}
            mission={mission}
            // BUG 2: a numeração vem da POSIÇÃO na trilha, não do dado.
            moduleNumber={index + 1}
            reason={custom?.modules.find((m) => m.mission.id === mission.id)?.reason}
            origin={custom?.modules.find((m) => m.mission.id === mission.id)?.sourceLabel}
            status={statusOf(index, mission.id)}
            isLast={index === missions.length - 1}
            onOpen={() => onOpen(mission.id)}
          />
        ))}
      </ol>
    </div>
  );
}

function MissionNode({
  mission,
  moduleNumber,
  reason,
  origin,
  status,
  isLast,
  onOpen,
}: {
  mission: PublicMission;
  moduleNumber: number;
  reason?: string;
  origin?: string;
  status: MissionStatus;
  isLast: boolean;
  onOpen: () => void;
}) {
  const unlocked = status !== "locked";

  const badge = {
    done: { Icon: CircleCheckBig, ring: "border-emerald-500 bg-emerald-500/15 text-emerald-400" },
    review: { Icon: RotateCcw, ring: "border-amber-500 bg-amber-500/15 text-amber-400" },
    current: { Icon: Shield, ring: "border-violet-400 bg-violet-500/20 text-violet-300" },
    locked: { Icon: Lock, ring: "border-neutral-800 bg-neutral-900 text-neutral-600" },
  }[status];

  const BadgeIcon = badge.Icon;

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${badge.ring} ${
            status === "current" ? "ring-4 ring-violet-500/20" : ""
          }`}
        >
          <BadgeIcon size={17} strokeWidth={2.4} aria-hidden />
        </div>
        {!isLast && (
          <div
            aria-hidden
            className={`w-0.5 flex-1 ${
              status === "done" || status === "review" ? "bg-emerald-500/40" : "bg-neutral-800"
            }`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <button
          type="button"
          onClick={unlocked ? onOpen : undefined}
          disabled={!unlocked}
          aria-label={
            unlocked
              ? `Abrir módulo ${moduleNumber}: ${mission.title}`
              : `Módulo ${moduleNumber}: ${mission.title} — bloqueado`
          }
          className={`w-full rounded-2xl border p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
            status === "current"
              ? "border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-emerald-500/10 hover:border-violet-400"
              : status === "locked"
                ? "cursor-not-allowed border-neutral-900 bg-neutral-950/60 opacity-60"
                : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Módulo {moduleNumber} · {mission.theme}
            </span>
            {status === "current" && (
              <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                Desbloqueada
              </span>
            )}
            {status === "review" && (
              <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                Revisar
              </span>
            )}
            {status === "done" && (
              <span className="shrink-0 text-[10px] font-bold text-emerald-400">Concluída</span>
            )}
          </div>

          <div className="text-sm font-bold">{mission.title}</div>

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1">
              <Clock size={11} aria-hidden /> 3 min
            </span>
            {/* O rótulo mostra o TEMA do módulo, não o motor que o executa.
                O motor "phishing" hoje roda cenários de fraude no caixa e de
                acesso físico — chamar tudo de phishing distorce a leitura da
                trilha, que foi exatamente a crítica recebida. */}
            <span>
              {mission.kind === "phishing" || mission.kind === "sms"
                ? mission.theme
                : KIND_LABEL[mission.kind]}
            </span>
            {origin && <span className="text-neutral-600">origem: {origin}</span>}
          </div>

          {reason && (
            <div className="mt-2.5 flex items-start gap-1.5 border-t border-neutral-800 pt-2 text-[11px] leading-relaxed text-violet-300/90">
              <Sparkles size={11} className="mt-0.5 shrink-0" aria-hidden />
              <span>{reason}</span>
            </div>
          )}
        </button>
      </div>
    </li>
  );
}

// ============================================================
// BRIEFING — pílula de conhecimento
// ============================================================

function Briefing({
  mission,
  moduleNumber,
  onStart,
  onBack,
}: {
  mission: PublicMission;
  moduleNumber: number;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col px-5 pt-5 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex w-fit items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300"
      >
        <ArrowLeft size={13} aria-hidden /> Trilha
      </button>

      <div className="mb-2 flex items-center gap-2">
        <Info size={16} className="text-violet-400" aria-hidden />
        <span className="text-xs font-bold tracking-wide text-violet-400 uppercase">
          Pílula de conhecimento
        </span>
      </div>
      <h2 className="mb-1 text-2xl font-black tracking-tight">{mission.title}</h2>
      <p className="mb-6 text-[11px] tracking-wide text-neutral-500 uppercase">
        Módulo {moduleNumber} · {mission.theme}
      </p>

      <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="mb-2 text-sm font-bold text-emerald-400">Entendendo a ameaça</h3>
        <p className="mb-4 text-sm leading-relaxed text-neutral-300">{mission.briefing.theory}</p>
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-3">
          <p className="mb-1 flex items-center gap-1 text-xs font-bold text-white">
            <AlertTriangle size={12} className="text-orange-400" aria-hidden /> Regra de ouro
          </p>
          <p className="text-xs leading-relaxed text-neutral-400">{mission.briefing.keyPoint}</p>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-neutral-800/70 bg-neutral-900/40 p-3 text-[11px] leading-relaxed text-neutral-500">
        <GraduationCap size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Errar não encerra a missão. Ao esgotar os escudos, o exercício entra em Modo Guiado e você
          conclui com apoio — o objetivo é o padrão ficar na cabeça, não a nota.
        </span>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 py-3.5 text-sm font-bold text-black lg:mt-8"
      >
        Estou preparado <ArrowRight size={16} aria-hidden />
      </button>
    </div>
  );
}

// ============================================================
// MISSION RUNNER — escudos, dica, Modo Guiado e feedback
// ============================================================

type Feedback =
  | {
      kind: "success";
      message: string;
      xp: number;
      struggled: boolean;
      breakdown?: QuizBreakdownItem[];
      spot?: ValidationResponse["spotBreakdown"];
      sequence?: ValidationResponse["sequenceBreakdown"];
    }
  | {
      kind: "retry";
      message: string;
      guided: boolean;
      breakdown?: QuizBreakdownItem[];
      spot?: ValidationResponse["spotBreakdown"];
      sequence?: ValidationResponse["sequenceBreakdown"];
    };

function MissionRunner({
  mission,
  sectorId,
  savedState,
  onStateChange,
  onComplete,
  onFailure,
  onBack,
}: {
  mission: PublicMission;
  sectorId: SectorId;
  savedState?: { attempt: number; hintUsed: boolean; guided: boolean };
  onStateChange: (
    missionId: string,
    next: { attempt: number; hintUsed: boolean; guided: boolean },
  ) => void;
  onComplete: (missionId: string, xp: number, struggled: boolean) => void;
  onFailure: () => void;
  onBack: () => void;
}) {
  // Escudos, dica e Modo Guiado são restaurados após um F5.
  const [attempt, setAttempt] = useState(savedState?.attempt ?? 1);
  const [hintUsed, setHintUsed] = useState(savedState?.hintUsed ?? false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [guided, setGuided] = useState(savedState?.guided ?? false);

  useEffect(() => {
    onStateChange(mission.id, { attempt, hintUsed, guided });
  }, [attempt, hintUsed, guided, mission.id, onStateChange]);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [triedOptions, setTriedOptions] = useState<string[]>([]);

  const shieldsLeft = Math.max(0, SHIELDS - (attempt - 1));

  const toggleHint = () => {
    // A penalidade só é marcada ao ABRIR a dica; fechar não custa de novo.
    setHintUsed((used) => used || !showHint);
    setShowHint((visible) => !visible);
  };

  const submit = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      try {
        const response = await fetch("/api/missions/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectorId, missionId: mission.id, hintUsed, attempt, ...payload }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = (await response.json()) as ValidationResponse;

        if (result.correct) {
          setFeedback({
            kind: "success",
            message: result.message,
            xp: result.xpAwarded,
            struggled: attempt > 1 || guided,
            breakdown: result.quizBreakdown,
            spot: result.spotBreakdown,
            sequence: result.sequenceBreakdown,
          });
          return;
        }

        if (mission.kind !== "rapid") onFailure();
        if (result.guided) setGuided(true);
        if (result.revealedLineIds) setRevealed(result.revealedLineIds);
        if (typeof payload.optionId === "string") {
          const chosen = payload.optionId;
          setTriedOptions((currentTried) => [...currentTried, chosen]);
        }
        setAttempt((currentAttempt) => currentAttempt + 1);
        setFeedback({
          kind: "retry",
          message: result.message,
          guided: result.guided,
          breakdown: result.quizBreakdown,
          spot: result.spotBreakdown,
          sequence: result.sequenceBreakdown,
        });
      } catch {
        setFeedback({
          kind: "retry",
          message:
            "Não foi possível falar com o servidor de validação. Nenhum escudo foi consumido — tente enviar de novo.",
          guided,
        });
      } finally {
        setBusy(false);
      }
    },
    [attempt, guided, hintUsed, mission.id, mission.kind, onFailure, sectorId],
  );

  const dismiss = () => {
    if (!feedback) return;
    if (feedback.kind === "success") {
      onComplete(mission.id, feedback.xp, feedback.struggled);
      return;
    }
    setFeedback(null);
  };

  return (
    <div className="relative flex flex-1 flex-col pt-5 pb-6">
      <div className="mb-4 flex items-center justify-between px-5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300"
        >
          <ArrowLeft size={13} aria-hidden /> Pausar
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleHint}
            aria-expanded={showHint}
            className={`flex items-center gap-1 rounded border px-2 py-1 transition-colors ${
              hintUsed
                ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                : "border-neutral-700 bg-neutral-900 text-neutral-400"
            }`}
          >
            <Lightbulb size={13} aria-hidden />
            <span className="text-[10px] font-bold">
              {hintUsed ? "DICA USADA" : "DICA (-30 XP)"}
            </span>
          </button>
          <div
            className={`flex gap-1 ${mission.kind === "rapid" || mission.kind === "quiz" ? "hidden" : ""}`}
            aria-label={`${shieldsLeft} de ${SHIELDS} escudos restantes`}
          >
            {Array.from({ length: SHIELDS }, (_, i) => (
              <Shield
                key={i}
                size={15}
                aria-hidden
                className={
                  i < shieldsLeft
                    ? "fill-emerald-500/30 text-emerald-400"
                    : "fill-neutral-900 text-neutral-700"
                }
              />
            ))}
          </div>
        </div>
      </div>

      {guided && (
        <div className="mx-5 mb-4 flex items-start gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 p-3 text-xs leading-relaxed text-violet-200">
          <GraduationCap size={15} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong>Modo guiado.</strong> Os escudos acabaram, mas a missão continua. As pistas estão
            à mostra — conclua o exercício para fixar o padrão.
          </span>
        </div>
      )}

      {showHint && (
        <div className="mx-5 mb-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs leading-relaxed text-orange-200">
          <strong>Dica do instrutor:</strong> {mission.hint}
        </div>
      )}

      <div className="mx-auto flex w-full flex-1 flex-col px-5 pb-4 lg:max-w-2xl">
        {mission.kind === "censor" ? (
          <CensorEngine
            prompt={mission.prompt}
            busy={busy}
            revealed={revealed}
            onSubmit={(maskedLineIds) => submit({ kind: "censor", maskedLineIds })}
          />
        ) : mission.kind === "spot" ? (
          <SpotEngine
            key={`spot-${attempt}`}
            mission={mission}
            busy={busy}
            revealed={revealed}
            onSubmit={(flaggedIds) => submit({ kind: "spot", flaggedIds })}
          />
        ) : mission.kind === "sequence" ? (
          <SequenceEngine
            key={`seq-${attempt}`}
            mission={mission}
            busy={busy}
            onSubmit={(orderedIds) => submit({ kind: "sequence", orderedIds })}
          />
        ) : mission.kind === "quiz" ? (
          <FinalChallengeEngine
            // remonta a cada tentativa: rodada nova, cronômetro novo
            key={`quiz-${attempt}`}
            mission={mission}
            busy={busy}
            guided={guided}
            onRoundEnd={(answers, timedOut) => submit({ kind: "quiz", answers, timedOut })}
          />
        ) : mission.kind === "rapid" ? (
          <RapidFireEngine
            key={`rapid-${attempt}`}
            mission={mission}
            busy={busy}
            guided={guided}
            onCardMissed={onFailure}
            onRoundEnd={(answers) => submit({ kind: "rapid", answers })}
          />
        ) : (
          <PhishingEngine
            mission={mission}
            busy={busy}
            tried={triedOptions}
            onSelect={(optionId) => submit({ kind: "choice", optionId })}
          />
        )}
      </div>

      {feedback && <FeedbackModal feedback={feedback} onDismiss={dismiss} />}
    </div>
  );
}

function FeedbackModal({ feedback, onDismiss }: { feedback: Feedback; onDismiss: () => void }) {
  const success = feedback.kind === "success";
  const guidedRetry = feedback.kind === "retry" && feedback.guided;

  const tone = success
    ? "border-emerald-500/40 bg-emerald-500/10"
    : guidedRetry
      ? "border-violet-500/40 bg-violet-500/10"
      : "border-orange-500/40 bg-orange-500/10";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-6 backdrop-blur-sm"
    >
      <div className={`w-full rounded-2xl border p-6 text-center lg:max-w-lg ${tone}`}>
        <div className="mb-4 flex justify-center">
          {success ? (
            <ShieldCheck size={44} className="text-emerald-500" aria-hidden />
          ) : guidedRetry ? (
            <GraduationCap size={44} className="text-violet-400" aria-hidden />
          ) : (
            <AlertTriangle size={44} className="text-orange-500" aria-hidden />
          )}
        </div>

        <h3 className="mb-2 text-lg font-bold">
          {success ? "Ameaça neutralizada" : guidedRetry ? "Vamos juntos" : "Ainda não"}
        </h3>
        <p className="mb-5 text-sm leading-relaxed text-neutral-300">{feedback.message}</p>

        {feedback.spot && feedback.spot.length > 0 && (
          <div className="mb-5 flex max-h-64 flex-col gap-2 overflow-y-auto text-left">
            {feedback.spot.map((item) => (
              <div
                key={item.lineId}
                className={`rounded-xl border p-3 ${
                  item.status === "hit"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : item.status === "missed"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="mb-1 flex items-start gap-1.5">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 text-[9px] font-black uppercase ${
                      item.status === "hit"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : item.status === "missed"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {item.status === "hit" ? "achou" : item.status === "missed" ? "passou" : "não era"}
                  </span>
                  <span className="text-[11px] leading-snug text-neutral-200">{item.text}</span>
                </div>
                {item.why && (
                  <p className="pl-1 text-[11px] leading-relaxed text-neutral-400">{item.why}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {feedback.sequence && (
          <div className="mb-5 flex max-h-64 flex-col gap-1.5 overflow-y-auto text-left">
            {feedback.sequence.map((item) => (
              <div
                key={item.position}
                className={`flex gap-2 rounded-xl border p-2.5 ${
                  item.correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-black">
                  {item.position}
                </span>
                <div className="min-w-0 text-[11px] leading-snug">
                  <div className="text-neutral-200">{item.text}</div>
                  {!item.correct && (
                    <div className="mt-0.5 text-red-300/80">você colocou: {item.playerText}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {feedback.breakdown && (
          <div className="mb-5 flex max-h-64 flex-col gap-2 overflow-y-auto text-left">
            {feedback.breakdown.map((item) => (
              <div
                key={item.questionId}
                className={`rounded-xl border p-3 ${
                  item.correct
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="mb-1 flex items-start gap-1.5">
                  {item.correct ? (
                    <CircleCheckBig size={13} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                  ) : (
                    <X size={13} className="mt-0.5 shrink-0 text-red-400" aria-hidden />
                  )}
                  <span className="text-[11px] leading-snug font-semibold text-neutral-200">
                    {item.prompt}
                  </span>
                </div>
                <p className="pl-[19px] text-[11px] leading-relaxed text-neutral-400">
                  {item.explanation}
                </p>
              </div>
            ))}
          </div>
        )}

        {success && (
          <div className="mb-5">
            <div className="font-bold text-emerald-400">+{feedback.xp} pontos GRC</div>
            {feedback.struggled && (
              <div className="mt-1 text-[11px] text-amber-300">
                Missão marcada para revisão — ela volta na sua trilha em alguns dias.
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className={`w-full rounded-full py-3.5 text-sm font-bold text-black ${
            success ? "bg-emerald-500" : guidedRetry ? "bg-violet-400" : "bg-orange-500"
          }`}
        >
          {success ? "Concluir missão" : guidedRetry ? "Continuar com apoio" : "Tentar de novo"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ENGINE — censura / DLP
// ============================================================

function maskText(text: string): string {
  return text.replace(/[^\s{}[\]"':,-]/g, "•");
}

function CensorEngine({
  prompt,
  busy,
  revealed,
  onSubmit,
}: {
  prompt: { id: string; text: string }[];
  busy: boolean;
  revealed: string[];
  onSubmit: (maskedLineIds: string[]) => void;
}) {
  const [masked, setMasked] = useState<string[]>([]);

  const toggle = (id: string) =>
    setMasked((currentMasked) =>
      currentMasked.includes(id)
        ? currentMasked.filter((x) => x !== id)
        : [...currentMasked, id],
    );

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-1 text-xl font-black tracking-tight">Higienização de dados</h2>
      <p className="mb-4 text-xs leading-relaxed text-neutral-400">
        Marque apenas as linhas com PII ou segredos. Mascarar demais também conta como erro: o filtro
        precisa ser preciso, não paranoico.
      </p>

      <div className="mb-5 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900 p-2 font-mono text-[11px] whitespace-pre">
        {prompt.map((line) => {
          const isMasked = masked.includes(line.id);
          const isRevealed = revealed.includes(line.id);
          return (
            <button
              key={line.id}
              type="button"
              aria-pressed={isMasked}
              aria-label={`Alternar máscara: ${line.text.trim()}`}
              onClick={() => toggle(line.id)}
              className={`block w-full rounded px-2 py-1 text-left transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none ${
                isMasked
                  ? "bg-violet-500/20 text-violet-300"
                  : isRevealed
                    ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40"
                    : "text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              {isMasked ? maskText(line.text) : line.text}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onSubmit(masked)}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-violet-500 py-3.5 text-sm font-bold text-black disabled:opacity-40 lg:mt-8"
      >
        {busy ? "Validando…" : "Validar filtro DLP"} <ShieldCheck size={15} aria-hidden />
      </button>
    </div>
  );
}

// ============================================================
// ENGINE — Encontre os sinais (spot the phish)
// ============================================================

function SpotEngine({
  mission,
  busy,
  revealed,
  onSubmit,
}: {
  mission: PublicSpotMission;
  busy: boolean;
  revealed: string[];
  onSubmit: (flaggedIds: string[]) => void;
}) {
  const [flagged, setFlagged] = useState<string[]>([]);
  const toggle = (id: string) =>
    setFlagged((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-1 text-xl font-black tracking-tight">Onde estão os sinais?</h2>
      <p className="mb-4 text-xs leading-relaxed text-neutral-400">
        Toque em cada linha que seja um indicador de golpe. Marque só o que é sinal — marcar tudo
        conta como erro.
      </p>

      <div className="mb-5 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 text-black">
        <div className="border-b border-neutral-300 px-4 py-3">
          <div className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
            {mission.header.channel}
          </div>
          <div className="text-sm font-bold">{mission.header.subject}</div>
        </div>
        <div className="flex flex-col">
          {mission.lines.map((line) => {
            const on = flagged.includes(line.id);
            const hint = revealed.includes(line.id);
            return (
              <button
                key={line.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(line.id)}
                className={`border-b border-neutral-200 px-4 py-2.5 text-left text-[13px] leading-relaxed transition-all duration-200 last:border-b-0 ${
                  on
                    ? "bg-red-100 text-red-900 ring-1 ring-red-400 ring-inset"
                    : hint
                      ? "bg-amber-100 text-amber-900"
                      : "hover:bg-neutral-200"
                }`}
              >
                {on && <TriangleAlert size={12} className="mr-1.5 inline text-red-600" aria-hidden />}
                {line.text}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 text-[11px] text-neutral-500">
        {flagged.length === 0 ? "Nenhuma linha marcada" : `${flagged.length} linha(s) marcada(s)`}
      </div>

      <button
        type="button"
        disabled={busy || flagged.length === 0}
        onClick={() => onSubmit(flagged)}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-30 lg:mt-8"
      >
        {busy ? "Verificando…" : "Confirmar sinais"} <ShieldCheck size={15} aria-hidden />
      </button>
    </div>
  );
}

// ============================================================
// ENGINE — Ordem de resposta (tabletop)
// ============================================================

function SequenceEngine({
  mission,
  busy,
  onSubmit,
}: {
  mission: PublicSequenceMission;
  busy: boolean;
  onSubmit: (orderedIds: string[]) => void;
}) {
  const [order, setOrder] = useState<string[]>(() => mission.steps.map((step) => step.id));
  const byId = new Map(mission.steps.map((step) => [step.id, step]));

  const move = (index: number, delta: number) => {
    setOrder((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-1 text-xl font-black tracking-tight">Em que ordem você age?</h2>
      <div className="mb-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs leading-relaxed text-orange-100">
        {mission.scenario}
      </div>
      <p className="mb-3 text-[11px] text-neutral-500">
        Use as setas para ordenar. O primeiro passo fica no topo.
      </p>

      <ol className="mb-5 flex flex-col gap-2">
        {order.map((id, index) => {
          const step = byId.get(id);
          if (!step) return null;
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 p-2.5 transition-all duration-200"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-black text-violet-300">
                {index + 1}
              </span>
              <span className="flex-1 text-[13px] leading-snug text-neutral-200">{step.text}</span>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  aria-label="Mover para cima"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300 transition-colors hover:bg-neutral-800 disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Mover para baixo"
                  disabled={index === order.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300 transition-colors hover:bg-neutral-800 disabled:opacity-25"
                >
                  ▼
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        disabled={busy}
        onClick={() => onSubmit(order)}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-violet-400 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-30 lg:mt-8"
      >
        {busy ? "Verificando…" : "Confirmar ordem"} <ArrowRight size={15} aria-hidden />
      </button>
    </div>
  );
}

// ============================================================
// ENGINE — Desafio Final (3 perguntas, cronômetro da RODADA)
// ============================================================

function FinalChallengeEngine({
  mission,
  busy,
  guided,
  onRoundEnd,
}: {
  mission: PublicQuizMission;
  busy: boolean;
  guided: boolean;
  onRoundEnd: (
    answers: Array<{ questionId: string; optionId: string | null }>,
    timedOut: boolean,
  ) => void;
}) {
  // O cronômetro cobre a RODADA inteira: quem sabe responde rápido e
  // sobra tempo para a pergunta difícil. Cronômetro por pergunta seria
  // pressão sem ganho pedagógico.
  const totalMs = (guided ? mission.roundSeconds * 2 : mission.roundSeconds) * 1000;

  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  const remaining = Math.max(0, totalMs - (now - startedAt));
  const ratio = remaining / totalMs;
  const urgent = ratio <= 0.25;

  const question = mission.questions[index];
  const total = mission.questions.length;
  const answered = Object.keys(picks).length;

  const finishRef = useRef<(timedOut: boolean) => void>(() => {});
  // Uma rodada termina uma única vez: o encerramento manual aos 44s não
  // pode ser seguido pelo encerramento do cronômetro aos 45s.
  const doneRef = useRef(false);

  const finish = useCallback(
    (timedOut: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      onRoundEnd(
        mission.questions.map((item) => ({
          questionId: item.id,
          optionId: picks[item.id] ?? null,
        })),
        timedOut,
      );
    },
    [mission.questions, onRoundEnd, picks],
  );

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current - startedAt >= totalMs) {
        clearInterval(id);
        finishRef.current(true);
      }
    }, 200);
    return () => clearInterval(id);
  }, [startedAt, totalMs]);

  const choose = (optionId: string) => {
    if (!question) return;
    setPicks((current) => ({ ...current, [question.id]: optionId }));
    if (index + 1 < total) setIndex(index + 1);
  };

  if (!question) return null;

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-violet-300 uppercase">
          <Flag size={12} aria-hidden /> Desafio final
        </span>
        <span
          className={`font-mono text-lg font-black tabular-nums transition-colors duration-300 ${
            urgent ? "text-red-400" : "text-neutral-200"
          }`}
        >
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")}
        </span>
      </div>

      {/* cronômetro da rodada */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
            urgent ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-emerald-500"
          }`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      {/* trilha de perguntas */}
      <div className="mb-5 flex items-center gap-1.5">
        {mission.questions.map((item, position) => {
          const done = Boolean(picks[item.id]);
          const active = position === index;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`Ir para a pergunta ${position + 1}`}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                active
                  ? "bg-violet-400"
                  : done
                    ? "bg-emerald-500/70"
                    : "bg-neutral-800 hover:bg-neutral-700"
              }`}
            />
          );
        })}
      </div>

      <div className="mb-1 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
        Pergunta {index + 1} de {total}
      </div>
      <h2 className="mb-5 text-lg leading-snug font-black tracking-tight">{question.prompt}</h2>

      <div className="flex flex-col gap-2.5">
        {question.options.map((option) => {
          const selected = picks[question.id] === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={busy}
              onClick={() => choose(option.id)}
              className={`rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none disabled:opacity-40 ${
                selected
                  ? "border-violet-400 bg-violet-500/20 text-white"
                  : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={busy || answered === 0}
        onClick={() => finish(false)}
        className="mt-auto w-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-30 lg:mt-8"
      >
        {answered < total ? `Encerrar (${answered}/${total} respondidas)` : "Concluir desafio"}
      </button>
    </div>
  );
}

// ============================================================
// ENGINE — Rapid Fire (reconhecimento sob pressão)
// ============================================================

const CHANNEL_META: Record<
  PublicRapidCard["channel"],
  { label: string; Icon: LucideIcon }
> = {
  sms: { label: "SMS", Icon: MessageSquare },
  email: { label: "E-mail", Icon: Mail },
  chat: { label: "Mensagem interna", Icon: MessageSquare },
  push: { label: "Notificação", Icon: Zap },
};

interface CardVerdictState extends RapidAnswerResponse {
  chosen: RapidVerdict;
}

function RapidFireEngine({
  mission,
  busy,
  guided,
  onCardMissed,
  onRoundEnd,
}: {
  mission: PublicRapidMission;
  busy: boolean;
  guided: boolean;
  onCardMissed: () => void;
  onRoundEnd: (answers: Array<{ cardId: string; verdict: RapidVerdict }>) => void;
}) {
  // No Modo Guiado o cronômetro triplica: quem já errou três vezes
  // precisa de tempo para LER os indicadores, não de mais pressão.
  const seconds = guided ? mission.secondsPerCard * 3 : mission.secondsPerCard;
  const totalCards = mission.cards.length;

  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [answers, setAnswers] = useState<Array<{ cardId: string; verdict: RapidVerdict }>>([]);
  const [verdict, setVerdict] = useState<CardVerdictState | null>(null);
  const [checking, setChecking] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());

  const card = mission.cards[index];
  const remaining = deadline === null ? seconds * 1000 : Math.max(0, deadline - now);
  const ratio = Math.max(0, Math.min(1, remaining / (seconds * 1000)));

  const answerRef = useRef<(chosen: RapidVerdict) => void>(() => {});

  const answer = useCallback(
    async (chosen: RapidVerdict) => {
      if (checking || verdict || !card) return;
      setChecking(true);
      setDeadline(null); // congela o cronômetro enquanto o veredito volta

      const record = { cardId: card.id, verdict: chosen };
      setAnswers((current) => [...current, record]);

      try {
        const response = await fetch("/api/rapid/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = (await response.json()) as RapidAnswerResponse;

        setVerdict({ ...result, chosen });
        if (!result.correct) {
          setHearts((current) => Math.max(0, current - 1));
          onCardMissed();
        }
      } catch {
        setVerdict({
          correct: false,
          isScam: false,
          verdictLabel: "Falha de conexão",
          explanation:
            "Não foi possível validar este card com o servidor. Ele não conta contra você — siga para o próximo.",
          chosen,
        });
      } finally {
        setChecking(false);
      }
    },
    [card, checking, onCardMissed, verdict],
  );

  // O cronômetro precisa da versão mais recente de `answer` sem
  // recriar o intervalo a cada render — daí o ref, atualizado no efeito.
  useEffect(() => {
    answerRef.current = (chosen: RapidVerdict) => {
      void answer(chosen);
    };
  }, [answer]);

  // Cronômetro: o setState acontece dentro do callback do intervalo,
  // nunca no corpo do efeito.
  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        clearInterval(id);
        answerRef.current("timeout");
      }
    }, 100);
    return () => clearInterval(id);
  }, [deadline]);

  const advance = () => {
    const next = index + 1;
    const finalAnswers = answers;
    if (next >= totalCards || hearts === 0) {
      onRoundEnd(finalAnswers);
      return;
    }
    setVerdict(null);
    setIndex(next);
    setDeadline(Date.now() + seconds * 1000);
    setNow(Date.now());
  };

  if (!card) return null;

  const channel = CHANNEL_META[card.channel];
  const ChannelIcon = channel.Icon;
  const urgent = ratio <= 0.34;
  const lastCard = index + 1 >= totalCards || hearts === 0;

  return (
    <div className="flex h-full flex-col">
      {/* placar da rodada */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
          Card {index + 1} de {totalCards}
        </span>
        <div className="flex items-center gap-1" aria-label={`${hearts} de 3 corações`}>
          {[0, 1, 2].map((i) => (
            <Heart
              key={i}
              size={14}
              aria-hidden
              className={
                i < hearts
                  ? "fill-red-500 text-red-500 transition-all duration-300"
                  : "fill-neutral-900 text-neutral-700 transition-all duration-300"
              }
            />
          ))}
        </div>
      </div>

      {/* cronômetro */}
      <div className="mb-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              urgent ? "bg-red-500" : "bg-gradient-to-r from-emerald-500 to-violet-500"
            }`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
          <span>{guided ? "Tempo estendido (modo guiado)" : "Decida rápido"}</span>
          <span className={urgent ? "font-bold text-red-400" : ""}>
            {(remaining / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* card */}
      <div
        key={card.id}
        className="mb-5 rounded-2xl border border-neutral-700 bg-gradient-to-b from-neutral-100 to-white p-4 text-black shadow-2xl transition-all duration-300"
      >
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
          <ChannelIcon size={11} aria-hidden /> {channel.label}
        </div>
        <div className="text-sm leading-tight font-bold">{card.subject}</div>
        <div className="mt-1 mb-3 border-b border-neutral-300 pb-3 text-[11px] break-words text-neutral-600">
          De: <span className="font-semibold text-blue-800">{card.sender}</span>
        </div>
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{card.body}</p>
      </div>

      {/* veredito ou botões */}
      {verdict ? (
        <div
          className={`mt-auto rounded-2xl border p-4 transition-all duration-300 lg:mt-8 ${
            verdict.correct
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-red-500/50 bg-red-500/10"
          }`}
        >
          <div className="mb-1.5 flex items-center gap-2">
            {verdict.correct ? (
              <CircleCheckBig size={16} className="text-emerald-400" aria-hidden />
            ) : (
              <X size={16} className="text-red-400" aria-hidden />
            )}
            <span className="text-sm font-bold">
              {verdict.chosen === "timeout"
                ? "Tempo esgotado"
                : verdict.correct
                  ? "Correto"
                  : "Incorreto"}
            </span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                verdict.isScam
                  ? "bg-red-500/20 text-red-300"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {verdict.verdictLabel}
            </span>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-neutral-300">{verdict.explanation}</p>
          <button
            type="button"
            disabled={busy}
            onClick={advance}
            className="w-full rounded-full bg-neutral-200 py-3 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-40"
          >
            {lastCard ? "Ver resultado da rodada" : "Próximo card"}
          </button>
        </div>
      ) : (
        <div className="mt-auto grid grid-cols-2 gap-3 lg:mt-8">
          <button
            type="button"
            disabled={checking}
            onClick={() => void answer("safe")}
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/10 py-5 font-black text-emerald-300 transition-all duration-300 hover:scale-105 hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-95 disabled:opacity-40"
          >
            <ShieldCheck size={22} aria-hidden />
            <span className="text-sm tracking-wide">SEGURO</span>
          </button>
          <button
            type="button"
            disabled={checking}
            onClick={() => void answer("scam")}
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-red-500/60 bg-red-500/10 py-5 font-black text-red-300 transition-all duration-300 hover:scale-105 hover:border-red-400 hover:bg-red-500/20 active:scale-95 disabled:opacity-40"
          >
            <TriangleAlert size={22} aria-hidden />
            <span className="text-sm tracking-wide">GOLPE</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ENGINE — phishing / smishing
// ============================================================

function PhishingEngine({
  mission,
  busy,
  tried,
  onSelect,
}: {
  mission: PublicChoiceMission;
  busy: boolean;
  tried: string[];
  onSelect: (optionId: string) => void;
}) {
  const isSms = mission.kind === "sms";
  const ChannelIcon = isSms ? MessageSquare : Mail;

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-4 text-xl font-black tracking-tight">Analise a situação</h2>

      <div className="mb-5 rounded-xl border border-neutral-200 bg-neutral-100 p-4 text-black">
        <div className="mb-3 border-b border-neutral-300 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <ChannelIcon size={14} aria-hidden /> {mission.message.subject}
          </div>
          <div className="mt-2 text-xs break-words text-neutral-600">
            De: <span className="font-semibold text-blue-800">{mission.message.sender}</span>
          </div>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{mission.message.body}</p>
      </div>

      <div className="mt-auto flex flex-col gap-2.5 lg:mt-8">
        {mission.options.map((option) => {
          const wasTried = tried.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              disabled={busy || wasTried}
              onClick={() => onSelect(option.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
                wasTried
                  ? "cursor-not-allowed border-red-500/30 bg-red-500/5 text-neutral-600 line-through"
                  : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// CYBERPEDIA — biblioteca de ameaças
// ============================================================

function CyberPediaList({ onOpen }: { onOpen: (id: string) => void }) {
  const totalMinutes = useMemo(
    () => CYBERPEDIA.reduce((sum, a) => sum + a.readingMinutes, 0),
    [],
  );

  return (
    <div className="px-5 pt-6 pb-10">
      <div className="mb-1 flex items-center gap-2">
        <BookOpen size={16} className="text-violet-400" aria-hidden />
        <span className="text-xs font-bold tracking-wide text-violet-400 uppercase">CyberPedia</span>
      </div>
      <h1 className="mb-1 text-2xl font-black tracking-tight">Biblioteca de ameaças</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Consulta livre, sem pontuação e sem prazo. {CYBERPEDIA.length} verbetes · {totalMinutes} min
        de leitura no total.
      </p>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
        {CYBERPEDIA.map((entry) => (
          <ArticleCard key={entry.id} entry={entry} onOpen={() => onOpen(entry.id)} />
        ))}
      </div>
    </div>
  );
}

function ArticleCard({ entry, onOpen }: { entry: Article; onOpen: () => void }) {
  const Icon = ARTICLE_ICONS[entry.icon];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/60 hover:bg-neutral-900 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 transition-all duration-300 group-hover:bg-violet-500/20">
          <Icon size={18} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span className="text-base leading-tight font-bold">{entry.title}</span>
            <span className="mt-0.5 flex shrink-0 items-center gap-1 text-[11px] text-neutral-500">
              <Clock size={11} aria-hidden /> {entry.readingMinutes} min
            </span>
          </div>
          <p className="mt-0.5 mb-2.5 text-xs leading-snug text-neutral-400">{entry.tldr}</p>
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold text-neutral-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  const ArticleIcon = ARTICLE_ICONS[article.icon];
  return (
    <article className="px-5 pt-5 pb-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex w-fit items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300"
      >
        <ArrowLeft size={13} aria-hidden /> CyberPedia
      </button>

      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-emerald-500/15 text-violet-200">
          <ArticleIcon size={22} aria-hidden />
        </div>
        <span className="rounded-full border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
          {article.family}
        </span>
      </div>

      <h1 className="mb-1 text-3xl leading-tight font-black tracking-tighter">{article.title}</h1>
      <p className="mb-3 text-sm text-neutral-400">{article.subtitle}</p>
      <div className="mb-7 flex flex-wrap items-center gap-1.5">
        {article.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold text-neutral-400"
          >
            {tag}
          </span>
        ))}
        <span className="ml-1 flex items-center gap-1 text-[11px] text-neutral-500">
          <Clock size={11} aria-hidden /> {article.readingMinutes} min
        </span>
      </div>

      {/* resumo em uma frase — a primeira coisa que a pessoa lê */}
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <p className="mb-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
          Em uma frase
        </p>
        <p className="text-[15px] leading-snug font-semibold text-neutral-100">{article.tldr}</p>
      </div>

      <AttackFlow steps={article.flow} icons={article.flowIcons} />

      <Section title="O que é" accent="emerald">
        <p className="text-sm leading-relaxed text-neutral-300">{article.whatItIs}</p>
      </Section>

      {article.stat && (
        <div className="mb-7 flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="shrink-0 text-2xl leading-none font-black text-violet-300">
            {article.stat.value}
          </div>
          <div className="min-w-0">
            <p className="text-xs leading-snug text-neutral-300">{article.stat.label}</p>
            <p className="mt-1 text-[10px] text-neutral-500">Fonte: {article.stat.source}</p>
          </div>
        </div>
      )}

      <Section title="Como o golpe acontece" accent="violet">
        <ol className="flex flex-col gap-3">
          {article.howTheyAct.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-black text-violet-300">
                {index + 1}
              </span>
              <span className="text-sm leading-relaxed text-neutral-300">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="O que você faz" accent="emerald">
        <ul className="flex flex-col gap-3">
          {article.defense.map((item) => (
            <li key={item} className="flex gap-2.5">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
              <span className="text-sm leading-relaxed text-neutral-300">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-violet-500/10 p-4">
        <p className="mb-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
          Leve isto com você
        </p>
        <p className="text-sm leading-relaxed font-semibold text-neutral-200">{article.takeaway}</p>
      </div>

      {/* A profundidade técnica que a banca elogiou continua aqui —
          fora do caminho de quem só quer entender o essencial. */}
      {article.deepDive && <DeepDive title={article.deepDive.title} body={article.deepDive.body} />}
    </article>
  );
}

const FLOW_ICONS: Record<FlowIconName, LucideIcon> = {
  Mail, Link, Lock, Coins, FileText, Cloud, DoorOpen, Server, CreditCard, Code, Phone, UserX,
  KeyRound, ShieldAlert, Usb, Bot, Building2, Truck, MessageSquare, Eye, QrCode, Mic, Smartphone,
  Printer, Users, BadgeCheck, Wifi, Package, CloudOff, Radar,
};

/**
 * Diagrama das três etapas do ataque. Cada verbete traz seus próprios
 * ícones, então a leitura visual muda de um tema para outro — chave e
 * cadeado no ransomware, QR e celular no quishing, microfone e telefone
 * no deepfake. Funciona offline, sem imagem externa.
 */
function AttackFlow({
  steps,
  icons,
}: {
  steps: [string, string, string];
  icons: [FlowIconName, FlowIconName, FlowIconName];
}) {
  const tones = [
    { ring: "border-violet-500/50", bg: "bg-violet-500/10", text: "text-violet-300" },
    { ring: "border-orange-500/50", bg: "bg-orange-500/10", text: "text-orange-300" },
    { ring: "border-red-500/50", bg: "bg-red-500/10", text: "text-red-300" },
  ];

  return (
    <figure className="mb-7">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-4">
        <ol className="grid grid-cols-3 gap-2">
          {steps.map((step, index) => {
            const Icon = FLOW_ICONS[icons[index]];
            const tone = tones[index];
            return (
              <li key={step} className="relative flex flex-col items-center text-center">
                {index < 2 && (
                  <span
                    aria-hidden
                    className="bq-flow-arrow absolute top-6 -right-3 text-neutral-600"
                    style={{ animationDelay: `${index * 0.5}s` }}
                  >
                    ›
                  </span>
                )}
                <div
                  className={`bq-flow-node flex h-12 w-12 items-center justify-center rounded-2xl border ${tone.ring} ${tone.bg} ${tone.text}`}
                  style={{ animationDelay: `${index * 0.4}s` }}
                >
                  <Icon size={22} strokeWidth={2} aria-hidden />
                </div>
                <span className="mt-2 text-[10px] font-bold text-neutral-500">{index + 1}</span>
                <span className="mt-0.5 text-[11px] leading-tight text-neutral-300">{step}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <figcaption className="mt-1.5 text-[10px] text-neutral-500">
        Como o ataque avança, da esquerda para a direita.
      </figcaption>
    </figure>
  );
}

/** Bloco técnico opcional: simplifica o padrão sem jogar fora a profundidade. */
function DeepDive({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-neutral-900"
      >
        <BrainCircuit size={14} className="shrink-0 text-violet-400" aria-hidden />
        <span className="flex-1 text-xs font-bold text-neutral-200">{title}</span>
        <ChevronDown
          size={15}
          aria-hidden
          className={`shrink-0 text-neutral-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="border-t border-neutral-800 px-4 py-3 text-xs leading-relaxed text-neutral-400">
          {body}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: "emerald" | "violet";
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h2
        className={`mb-3 border-l-2 pl-2.5 text-xs font-bold tracking-wide uppercase ${
          accent === "emerald"
            ? "border-emerald-500 text-emerald-400"
            : "border-violet-500 text-violet-400"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
