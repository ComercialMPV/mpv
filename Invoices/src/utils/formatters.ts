// src/utils/formatters.ts

/**
 * Formata um valor monetário de acordo com a moeda e locale
 * @param amount Valor em número (centavos ou valor inteiro dependendo da moeda)
 * @param currency Código da moeda (ISO 4217) ex: 'MZN', 'EUR', 'USD', 'BRL'
 * @param locale Locale para formatação (opcional, default pt-MZ)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'MZN',
  locale: string = 'pt-MZ'
): string {
  // Para moedas sem centavos (ex: MZN) podemos arredondar
  const value = Math.round(amount); // ou amount / 100 se vier em centavos

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'MZN' ? 0 : 2,
    maximumFractionDigits: currency === 'MZN' ? 0 : 2,
  }).format(value);
}

// Exemplos de uso:
// formatCurrency(2499, 'MZN')     → "2.499 MT"
// formatCurrency(2499.90, 'EUR')  → "2.499,90 €"
// formatCurrency(0, 'MZN')        → "0 MT"

/**
 * Outras funções úteis que costumam aparecer no mesmo ficheiro:
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

export function formatPercentage(value: number, decimals = 1): string {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// Podem vir mais no futuro...
// export function formatPhoneNumber(phone: string): string { ... }
// export function formatDocumentNumber(doc: string): string { ... }