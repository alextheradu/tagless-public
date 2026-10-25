export const PARTICIPATION_OPTIONS = [
  "I organized a workshop",
  "I attended a workshop",
  "I did this as an individual submission",
] as const;

export type Participation = (typeof PARTICIPATION_OPTIONS)[number];
