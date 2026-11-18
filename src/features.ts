export const FEATURES = {
  themes: 'premium',
  a4Printing: 'premium',
  teamDifficulty: 'premium',
  subjectSelection: 'premium',
  planning: 'basis',
  puzzles: 'basis',
  a5Printing: 'basis',
} as const;

export type Feature = keyof typeof FEATURES;
export const isPremiumFeature = (feature: Feature) => FEATURES[feature] === 'premium';
