/** Chaves de query, centralizadas para invalidação consistente. */
export const queryKeys = {
  snapshotRoot: ['snapshot'] as const,
  snapshot: (userId: string) => ['snapshot', userId] as const,
};
