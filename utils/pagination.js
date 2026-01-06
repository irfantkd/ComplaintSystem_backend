
/**
 * Reusable pagination function for any Mongoose model/query
 * @param {Object} options
 * @returns {Object} paginated results + metadata
 */
const paginate = async ({
  query = {},                  // Mongoose find query object
  model,                       // Mongoose model (required for count)
  page = 1,                    // Current page (default 1)
  limit = 10,                  // Items per page (default 10)
  sort = { createdAt: -1 },    // Sort order
  populate = []                // Array of populate options (strings or objects)
}) => {
  // Validate and sanitize inputs
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10))); // Max 100 per page
  const skip = (pageNum - 1) * limitNum;

  // Build the query
  let mongooseQuery = model.find(query).sort(sort).skip(skip).limit(limitNum);

  // Apply populate if provided
  if (populate.length > 0) {
    populate.forEach(pop => {
      if (typeof pop === 'string') {
        mongooseQuery = mongooseQuery.populate(pop);
      } else {
        mongooseQuery = mongooseQuery.populate(pop);
      }
    });
  }

  // Execute both queries in parallel
  const [data, totalCount] = await Promise.all([
    mongooseQuery.exec(),
    model.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    data,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limitNum,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? pageNum + 1 : null,
      prevPage: hasPrevPage ? pageNum - 1 : null
    }
  };
};

module.exports = { paginate };