import type { AgeLevel } from './puzzles.ts';

export const AGE_GROUPS = ['4–6','6–8','8–10','10–12','12–14'] as const;
export type AgeGroup = typeof AGE_GROUPS[number];

export function ageLevelFor(age: string): AgeLevel {
  if (age === '4–6' || age === '6–8') return 'young';
  if (age === '8–10') return 'middle';
  return 'older';
}
