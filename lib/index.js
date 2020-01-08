const mongoose = require('mongoose');
const {
  compareObjectIds,
  isDuplicate,
  getDuplicateFields,
  getOption,
} = require('./helpers');

const onMatch = (mergeOn, mergeAs) => (
  accumulator,
  current,
) => {
  const match = (item) =>
    compareObjectIds(item[mergeOn], current[mergeOn]) ||
    item[mergeOn] === current[mergeOn];

  const el = accumulator.find(match);

  if (!el) {
    accumulator.push(current);
  } else if (typeof mergeAs === 'function') {
    accumulator[accumulator.findIndex(match)] = mergeAs(
      el,
      current,
    );
  }

  return accumulator;
};

const reportDuplicates = (a) => {
  if (!a || !a.length) return undefined;
  const validationError = new mongoose.Error.ValidationError(
    null,
  );

  a.forEach((e) =>
    validationError.addError(
      e,
      new mongoose.Error.ValidatorError({
        message: 'Duplicate found',
      }),
    ),
  );

  return validationError;
};

module.exports = (s, opts = {}) =>
  s.pre('validate', async function dedupe(next) {
    Object.assign(opts, {
      options: { _id: { $ne: this._id }, ...opts.options },
    });

    const erroneous = [];
    const uniqueWith = getOption(s, 'dedupeWith');
    const uniqueBy = await getDuplicateFields(
      this,
      getOption(s, 'dedupe'),
      opts.options,
    );

    s.childSchemas.forEach(({ schema, model }) => {
      const target = this[model.path];
      const distinct = getOption(schema, 'distinct');
      const accumulators = getOption(schema, 'accumulate');
      const mergers = getOption(schema, 'merge');

      if (!Array.isArray(target) || !distinct.length)
        return;

      distinct.forEach((k) => {
        this[model.path] = target.reduce(
          onMatch(k, (before, after) => {
            if (!accumulators.length && !mergers.length)
              return erroneous.push(k);

            accumulators.forEach((path) =>
              Object.assign(before, {
                [path]: after[path] + before[path],
              }),
            );

            mergers.forEach((path) =>
              Object.assign(before, {
                [path]: after[path],
              }),
            );

            return before;
          }),
          [],
        );
      });
    });

    next(
      reportDuplicates(
        (await isDuplicate(this, uniqueWith, opts.options))
          ? uniqueWith
          : [].concat(uniqueBy).concat(erroneous),
      ),
    );
  });
