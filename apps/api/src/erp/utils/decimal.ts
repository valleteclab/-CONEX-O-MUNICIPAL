/** Normaliza valores monetários/quantidade para string DECIMAL(18,4). */
export function dec(n: number | string): string {
  const x = typeof n === 'string' ? parseFloat(n) : n;
  if (Number.isNaN(x)) {
    return '0.0000';
  }
  return x.toFixed(4);
}

export function decMul(a: string | number, b: string | number): string {
  return dec(Number(a) * Number(b));
}
