function indianCommaGroup(intPart: string): string {
  const negative = intPart.startsWith('-');
  const digits = negative ? intPart.slice(1) : intPart;
  if (digits.length <= 3) return negative ? `-${digits}` : digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const out = `${grouped},${last3}`;
  return negative ? `-${out}` : out;
}

export function toIndianNumber(n: number): string {
  if (!isFinite(n)) return '0';
  const [intPart, decPart] = Math.abs(n).toString().split('.');
  const grouped = indianCommaGroup((n < 0 ? '-' : '') + intPart);
  return decPart ? `${grouped}.${decPart}` : grouped;
}

export function toIndianCurrency(amount: number): string {
  if (!isFinite(amount)) return '₹0';
  const rounded = Math.round(amount);
  return `₹${indianCommaGroup(rounded.toString())}`;
}

export function toIndianWeight(kg: number): string {
  if (!isFinite(kg)) return '0 kg';
  return `${indianCommaGroup(Math.round(kg).toString())} kg`;
}

export function toIndianDate(timestamp: number | Date): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
