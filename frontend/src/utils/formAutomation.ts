export function normalizeEmail(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function onlyDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function formatCpfOrCnpj(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 11) return formatCpf(digits);
  return formatCnpj(digits);
}

export function formatWhatsappBr(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function clampWeeklyGoal(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(80, Math.round(value)));
}

export function inferAreaFromGoal(goal: string): string | null {
  const text = String(goal || '').toLowerCase();
  if (!text) return null;
  if (/(resid|revalida|medic)/.test(text)) return 'Residência Médica';
  if (/oab|direito|jur[íi]d|magistratura/.test(text)) return 'Direito';
  if (/enem|vestibular/.test(text)) return 'ENEM & Vestibulares';
  if (/concurso|edital/.test(text)) return 'Concursos Públicos';
  if (/engenh/.test(text)) return 'Engenharia';
  if (/p[oó]s|mestrado|doutorado/.test(text)) return 'Pós-Graduação';
  if (/idioma|ingl[eê]s|espanhol|franc[eê]s/.test(text)) return 'Línguas';
  return null;
}

export function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return fallback;
  }
}

export function safeWriteJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/private mode errors
  }
}
