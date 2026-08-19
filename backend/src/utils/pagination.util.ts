export const getPagination = (
  pageValue: unknown,
  limitValue: unknown,
  defaultLimit: number
) => {
  const page = Math.max(1, Number(pageValue) || 1);
  const requestedLimit = Number(limitValue) || defaultLimit;
  const limit = Math.min(100, Math.max(1, requestedLimit));
  return { page, limit };
};
