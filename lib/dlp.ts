import type { PromptLine } from "./types";

// ============================================================
// Motor de DLP — classificação de PII e segredos por regex.
//
// Esta é a peça que o relatório técnico descreve como
// "lista de expressões regulares pré-definidas no backend".
// Ela roda SÓ no servidor: o cliente recebe o trecho sem
// nenhuma marcação e precisa acertar sozinho.
// ============================================================

export interface Detector {
  /** rótulo exibido no feedback ao jogador */
  label: string;
  /** classificação usada em métricas de GRC */
  category: "PII" | "SECRET" | "FINANCIAL";
  pattern: RegExp;
  /** validação extra para reduzir falso positivo (ex.: dígito verificador) */
  confirm?: (match: string) => boolean;
}

/**
 * Valida os dois dígitos verificadores de um CPF.
 * Sem isso, qualquer sequência de 11 dígitos (um ID de pedido, por exemplo)
 * viraria falso positivo e o exercício perderia valor didático.
 */
export function isValidCpf(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // 000.000.000-00 e afins

  const checkDigit = (slice: string, startWeight: number): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i += 1) {
      sum += Number(slice[i]) * (startWeight - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = checkDigit(digits.slice(0, 9), 10);
  const d2 = checkDigit(digits.slice(0, 10), 11);
  return d1 === Number(digits[9]) && d2 === Number(digits[10]);
}

/**
 * Algoritmo de Luhn — mesmo critério que a bandeira usa.
 * Sem ele, qualquer sequência de 16 dígitos (um código de rastreio,
 * por exemplo) seria classificada como cartão.
 */
export function isValidCard(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = Number(digits[i]);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

export const DETECTORS: Detector[] = [
  {
    label: "CPF",
    category: "PII",
    pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
    confirm: isValidCpf,
  },
  {
    label: "Cartão de crédito",
    category: "FINANCIAL",
    pattern: /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,7}\b/g,
    confirm: isValidCard,
  },
  {
    label: "Chave de acesso AWS",
    category: "SECRET",
    pattern: /\b(?:AKIA|ASIA|AIDA|AROA)[0-9A-Z]{16}\b/g,
  },
  {
    label: "Token JWT",
    category: "SECRET",
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  },
  {
    label: "Chave privada",
    category: "SECRET",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    label: "Credencial em texto claro",
    category: "SECRET",
    // Captura pares chave/valor: "senha": "x", DB_PASSWORD=x, api_key: x.
    // Sem \b inicial de propósito — em DB_PASSWORD o underscore é caractere
    // de palavra e mataria a fronteira, deixando o segredo passar.
    pattern:
      /(?:senha|password|passwd|secret|token|api[_-]?key|client[_-]?secret|authorization)["']?\s*[:=]\s*["']?\S+/gi,
  },
  {
    label: "Remuneração",
    category: "FINANCIAL",
    // só dispara quando o valor está rotulado como salário/remuneração
    pattern:
      /\b(?:sal[áa]rio|remunera[çc][ãa]o|holerite)\b[^\n]{0,45}R\$\s*[\d.,]+/gi,
  },
];

export interface LineFinding {
  lineId: string;
  labels: string[];
}

/** Roda todos os detectores contra as linhas do prompt. */
export function scanLines(lines: PromptLine[]): LineFinding[] {
  const findings: LineFinding[] = [];

  for (const line of lines) {
    const labels = new Set<string>();

    for (const detector of DETECTORS) {
      // `lastIndex` é global por regex com flag /g — reseta antes de usar
      detector.pattern.lastIndex = 0;
      const matches = line.text.match(detector.pattern) ?? [];
      const hit = matches.some((m) => (detector.confirm ? detector.confirm(m) : true));
      if (hit) labels.add(detector.label);
    }

    if (labels.size > 0) {
      findings.push({ lineId: line.id, labels: [...labels] });
    }
  }

  return findings;
}

export interface CensorVerdict {
  correct: boolean;
  /** sensível e não mascarado — o erro grave */
  missed: LineFinding[];
  /** mascarado sem necessidade — falso positivo */
  falsePositives: string[];
  findings: string[];
}

/** Compara a seleção do jogador com o veredito do motor. */
export function judgeCensor(lines: PromptLine[], maskedLineIds: string[]): CensorVerdict {
  const masked = new Set(maskedLineIds);
  const findings = scanLines(lines);
  const sensitive = new Set(findings.map((f) => f.lineId));

  const missed = findings.filter((f) => !masked.has(f.lineId));
  const falsePositives = [...masked].filter((id) => !sensitive.has(id));

  return {
    correct: missed.length === 0 && falsePositives.length === 0,
    missed,
    falsePositives,
    findings: [...new Set(findings.flatMap((f) => f.labels))],
  };
}
