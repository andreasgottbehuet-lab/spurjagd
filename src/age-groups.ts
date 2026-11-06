import type { AgeLevel } from './puzzles.ts';

export const AGE_GROUPS = ['4–6','6–8','8–10','10–12','12–14','14+','18+'] as const;
export type AgeGroup = typeof AGE_GROUPS[number];

export function ageLevelFor(age: string): AgeLevel {
  if (age === '4–6') return 'young';
  if (age === '6–8') return 'early';
  if (age === '8–10') return 'middle';
  if (age === '10–12') return 'older';
  if (age === '12–14') return 'advanced';
  if (age === '14+') return 'expert';
  return 'adult';
}
