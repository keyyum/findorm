import { MAX_PAGE_SIZE, PAGE_SIZE } from "../config/constants.js";

/** page/limit from the query (docs/api-spec.md → "Paged lists"). */
export function paging(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || PAGE_SIZE, 1), MAX_PAGE_SIZE);
  return { page, limit, skip: (page - 1) * limit };
}

export const pagedResponse = (items, total, { page, limit }) => ({
  items,
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
