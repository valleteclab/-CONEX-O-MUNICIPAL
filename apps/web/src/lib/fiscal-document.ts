export type FiscalDocumentKind =
  | "empty"
  | "invalid"
  | "cpf"
  | "cnpj_numeric"
  | "cnpj_alphanumeric";

export type ParsedFiscalDocument = {
  normalized: string;
  kind: FiscalDocumentKind;
  isValid: boolean;
};

const CNPJ_WEIGHTS_FIRST = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_SECOND = [6, ...CNPJ_WEIGHTS_FIRST];

export function normalizeFiscalDocument(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function parseFiscalDocument(value: string | null | undefined): ParsedFiscalDocument {
  const normalized = normalizeFiscalDocument(value);
  if (!normalized) {
    return { normalized, kind: "empty", isValid: false };
  }

  if (/^\d{11}$/.test(normalized)) {
    return { normalized, kind: "cpf", isValid: true };
  }

  if (!/^[0-9A-Z]{12}\d{2}$/.test(normalized)) {
    return { normalized, kind: "invalid", isValid: false };
  }

  if (!isValidCnpj(normalized)) {
    return { normalized, kind: "invalid", isValid: false };
  }

  return {
    normalized,
    kind: /^\d{14}$/.test(normalized) ? "cnpj_numeric" : "cnpj_alphanumeric",
    isValid: true,
  };
}

export function isCnpjKind(kind: FiscalDocumentKind): boolean {
  return kind === "cnpj_numeric" || kind === "cnpj_alphanumeric";
}

export function supportsCurrentCnpjLookup(value: string | null | undefined): boolean {
  return parseFiscalDocument(value).kind === "cnpj_numeric";
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) {
    return false;
  }

  if (!/[A-Z]/.test(cnpj) && /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const base = cnpj.slice(0, 12);
  const expectedDigits = cnpj.slice(12);
  const firstDigit = calculateCheckDigit(base, CNPJ_WEIGHTS_FIRST);
  const secondDigit = calculateCheckDigit(`${base}${firstDigit}`, CNPJ_WEIGHTS_SECOND);

  return expectedDigits === `${firstDigit}${secondDigit}`;
}

function calculateCheckDigit(base: string, weights: number[]): number {
  const sum = base.split("").reduce((acc, char, index) => {
    return acc + (char.charCodeAt(0) - 48) * weights[index];
  }, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
