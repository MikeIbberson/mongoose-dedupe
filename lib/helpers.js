const greaterThanZero = (v) => v && v > 0;
const pushInto = (cond, v, a) => (cond ? a.concat(v) : a);
const hasLength = (a) => Array.isArray(a) && a.length;
const isEmpty = (o) =>
  typeof o !== 'object' || !Object.keys(o).length;

const from = (source, key) =>
  source[key] ? { [key]: source[key] } : {};

const customSchemaReducer = (s, next) => {
  let a = [];

  const iterateOverPaths = (name, type) => {
    a = next(a, { name, type });
  };

  const onEachPath = (schema) =>
    schema.eachPath(iterateOverPaths);

  if (
    s.discriminators &&
    Object.keys(s.discriminators).length
  )
    Object.values(s.discriminators).forEach((disc) => {
      onEachPath(disc);
    });

  onEachPath(s);
  return [...new Set(a)];
};

const reduceByObject = (a = [], o) =>
  hasLength(a)
    ? a.reduce(
        (curr, next) => Object.assign(curr, from(o, next)),
        {},
      )
    : [];

const runQuery = (source, o, etc) =>
  !isEmpty(o)
    ? source
        .countDocuments({ ...o, ...etc })
        .then(greaterThanZero)
    : Promise.resolve(0);

exports.eitherOr = (a, b) => {
  if (a) return a;
  if (b) return b;
  return undefined;
};

exports.getOption = (s, prop) =>
  customSchemaReducer(s, (acc, { name, type }) =>
    pushInto(type.options[prop], name, acc),
  );

exports.compareObjectIds = (a, b) => {
  try {
    return typeof a === 'object' && 'equals' in a
      ? a.equals(b)
      : a === b;
  } catch (e) {
    return false;
  }
};

exports.isDuplicate = (source, doc, keys, query = {}) =>
  runQuery(source, reduceByObject(keys, doc), query).then(
    (v) => greaterThanZero(v),
  );

exports.getDuplicateFields = (
  source,
  doc,
  keys,
  query = {},
) =>
  hasLength(keys)
    ? Promise.all(
        keys.map((key) =>
          runQuery(source, from(doc, key), query).then(
            (v) => (greaterThanZero(v) ? key : null),
          ),
        ),
      ).then((responses) =>
        responses.flat().filter(Boolean),
      )
    : [];
