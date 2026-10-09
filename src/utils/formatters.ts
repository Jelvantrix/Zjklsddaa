/**
 * Price and currency formatters for Zejesh
 */
export function formatPrice(amount: number = 0, currency = 'EUR'): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';
  return amount.toFixed(2).replace('.', ',') + ' €';
}
