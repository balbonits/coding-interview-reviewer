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

export function match(query, doc) {
  for (const [key, value] of Object.entries(query)) {
    if (key === "$and") {
      if (!value.every((sub) => match(sub, doc))) return false;
      continue;
    }
    if (key === "$or") {
      if (!value.some((sub) => match(sub, doc))) return false;
      continue;
    }
    if (!matchField(value, doc[key])) return false;
  }
  return true;
}

function matchField(condition, fieldValue) {
  if (isOperatorObject(condition)) {
    for (const [op, opVal] of Object.entries(condition)) {
      const fn = COMPARATORS[op];
      if (!fn) throw new Error(`unsupported operator: ${op}`);
      if (!fn(fieldValue, opVal)) return false;
    }
    return true;
  }
  return fieldValue === condition;
}

function isOperatorObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((k) => k.startsWith("$"))
  );
}
