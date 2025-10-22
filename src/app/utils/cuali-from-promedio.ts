// src/app/utils/cuali-from-promedio.ts

/**
 * Devuelve la calificación cualitativa según el promedio numérico.
 * Ejemplo: 9.5 → "A (Excelente)"
 */
export function cualiFromPromedio(promedio: number | null | undefined): string {
  if (promedio == null || isNaN(Number(promedio))) return '';

  const p = Number(promedio);

  if (p >= 9) return 'A (Excelente)';
  if (p >= 8) return 'B (Muy bueno)';
  if (p >= 7) return 'C (Bueno)';
  if (p >= 6) return 'D (Suficiente)';
  return 'E (Insuficiente)';
}
