export function generateCode(name: string, existingCodes: string[]): string {
  const words = name.trim().split(/\s+/);
  const base = words.map(w => w[0]?.toUpperCase() ?? '').join('');
  if (!existingCodes.includes(base)) return base;
  let i = 1;
  while (existingCodes.includes(`${base}${i}`)) i++;
  return `${base}${i}`;
}
