export const getPagination = (
  query,
  { defaultLimit = 10, maxLimit = 100 } = {},
) => {
  let page = parseInt(query?.page, 10);
  let limit = parseInt(query?.limit, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const buildMeta = ({ page, limit, total }) => {
  const safeTotal = Math.max(0, parseInt(total, 10) || 0);
  const totalPages = Math.ceil(safeTotal / limit) || 1;

  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
