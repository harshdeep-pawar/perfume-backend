/**
 * API Features Utility
 * --------------------
 * Provides reusable query features for MongoDB:
 * - Search (by product name using regex)
 * - Filter (by price range, category, brand, etc.)
 * - Sort (by price, ratings, createdAt, etc.)
 * - Pagination (limit & page-based)
 */

class ApiFeatures {
  /**
   * @param {Object} query - Mongoose query object
   * @param {Object} queryStr - Express request query string (req.query)
   */
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  /**
   * Search products by name using case-insensitive regex
   * Usage: ?keyword=lavender
   */
  search() {
    const keyword = this.queryStr.keyword
      ? {
          name: {
            $regex: this.queryStr.keyword,
            $options: 'i', // Case-insensitive
          },
        }
      : {};

    this.query = this.query.find({ ...keyword });
    return this;
  }

  /**
   * Filter products by various fields
   * Supports MongoDB comparison operators: gte, gt, lte, lt
   * Usage: ?price[gte]=50&price[lte]=200&category=floral&brand=Chanel
   */
  filter() {
    const queryCopy = { ...this.queryStr };

    // Fields to exclude from filtering (they have their own methods)
    const removeFields = ['keyword', 'page', 'limit', 'sort'];
    removeFields.forEach((field) => delete queryCopy[field]);

    // Convert filter operators to MongoDB format ($gte, $gt, $lte, $lt)
    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  /**
   * Sort results by specified field(s)
   * Usage: ?sort=price (ascending) or ?sort=-price (descending)
   * Multiple: ?sort=price,-ratings
   * Default: sorted by newest first
   */
  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  /**
   * Paginate results
   * Usage: ?page=2&limit=10
   * Default: page 1, 10 results per page
   */
  paginate() {
    const page = parseInt(this.queryStr.page, 10) || 1;
    const limit = parseInt(this.queryStr.limit, 10) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    this.page = page;
    this.limit = limit;
    return this;
  }
}

module.exports = ApiFeatures;
