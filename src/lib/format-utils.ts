/**
 * Formatting utilities with fixed locale to prevent SSR/client hydration mismatches.
 * Always use these instead of .toLocaleString() / .toLocaleDateString() directly.
 */

const LOCALE = "fr-FR";

/**
 * Format a number with locale-consistent thousand separators.
 * e.g. 82500 → "82 500"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString(LOCALE);
}

/**
 * Format a currency amount in EUR.
 * e.g. 82500 → "82 500 €"
 */
export function formatCurrency(value: number): string {
  return `${value.toLocaleString(LOCALE)} €`;
}

/**
 * Format a date to a short locale-consistent string.
 * e.g. "07/06/2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE);
}
