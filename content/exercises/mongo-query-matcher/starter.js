const COMPARATORS = {
  $eq: (a, b) => a === b,
  $ne: (a, b) => a !== b,
  $gt: (a, b) => a > b,
  $gte: (a, b) => a >= b,
  $lt: (a, b) => a < b,
  $lte: (a, b) => a <= b,
  $in: (a, b) => Array.isArray(b) && b.includes(a),
  $nin: (a, b) => Array.isArray(b) && !b.includes(a),
  $exists: (a, b) => (a !== undefined) === Boolean(b),
};

/**
 * Match a MongoDB-style query against a document.
 *
 * Supports:
 *   - Implicit equality on top-level fields                 { name: "Alice" }
 *   - Comparators: $eq $ne $gt $gte $lt $lte $in $nin $exists
 *   - Logical: $and, $or                                    { $or: [ ... ] }
 *
 * Out of scope: nested paths, $regex/$elemMatch/$all/$size/$not/$nor.
 *
 * @param {object} query - MongoDB-style query
 * @param {object} doc   - the document to test
 * @returns {boolean}
 */
export function match(query, doc) {
  // your code here
}
