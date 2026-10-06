/** Chaves de query, centralizadas para invalidação consistente. */
export const queryKeys = {
  snapshot: (userId: string) => ['snapshot', userId] as const,
};
