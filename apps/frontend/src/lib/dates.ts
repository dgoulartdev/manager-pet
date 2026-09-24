/**
 * Datas da API chegam como "YYYY-MM-DD" (sem hora). Montar o Date pelas partes
 * evita o deslocamento de fuso: new Date("2026-07-12") é meia-noite UTC, que no
 * Brasil ainda é dia 11.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Hoje em YYYY-MM-DD, no fuso do aparelho. */
export function todayIso(): string {
  const today = todayDateOnly();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

/** "12/07/2026" */
export function formatDate(value: string): string {
  return parseDateOnly(value).toLocaleDateString('pt-BR');
}

/** "12 de julho de 2026" */
export function formatLongDate(value: string): string {
  return parseDateOnly(value).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "12/07" */
export function formatDayMonth(value: string): string {
  return parseDateOnly(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** "Julho de 2026" — cabeçalho de grupo na linha do tempo. */
export function formatMonthYear(value: string): string {
  const text = parseDateOnly(value).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Dias inteiros de `from` até `to` (negativo se `to` já passou). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** Duração legível: "1 dia", "21 dias", "3 meses", "2 anos". Dias só até 60. */
export function formatDuration(days: number): string {
  const total = Math.abs(days);
  if (total < 60) return total === 1 ? '1 dia' : `${total} dias`;
  const months = Math.floor(total / 30);
  if (months < 24) return `${months} meses`;
  const years = Math.floor(total / 365);
  return years === 1 ? '1 ano' : `${years} anos`;
}

/** "hoje", "ontem", "há 26 dias", "há 3 meses". */
export function formatDaysAgo(value: string, today = todayDateOnly()): string {
  const days = daysBetween(parseDateOnly(value), today);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 60) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 24) return `há ${months} meses`;
  return `há ${Math.floor(days / 365)} anos`;
}
