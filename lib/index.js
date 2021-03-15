const mongoose = require('mongoose');
const {
  compareObjectIds,
  isDuplicate,
  getDuplicateFields,
  getOption,
  filter,
  hasLength,
} = require('./helpers');

const onMatch = (mergeOn, mergeAs) => (
  accumulator,
  current,
) => {
  if (!current || !current[mergeOn])
    return accumulator.concat(current);

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

const getModel = (context) => {
  let model;

  if (typeof context.ownerDocument === 'function') {
    model = context
      .ownerDocument()
      .model(context.ownerDocument().constructor.modelName);
  } else if (typeof context.model === 'function') {
    model = context.model(context.constructor.modelName);
  }

  if (model.baseModelName)
    return model.db.model(model.baseModelName);

  return model;
};

module.exports = (s, opts = {}) =>
  s.pre('validate', async function dedupe(next) {
    const query = { ...opts.options };
    const source = getModel(this);

    if (!this.isNew)
      Object.assign(query, {
        _id: { $ne: this._id },
      });

    const erroneous = [];
    const uniqueWith = getOption(s, 'dedupeWith');

    const filterByModified = (xs) =>
      filter(xs, (option) => this.isModified(option));

    const uniqueBy = await getDuplicateFields(
      source,
      this,
      filterByModified(getOption(s, 'dedupe')),
      query,
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

    const v1 = [].concat(uniqueBy).concat(erroneous);
    const v2 = filterByModified(uniqueWith);

    if (hasLength(v1)) next(reportDuplicates(v1));
    else if (hasLength(v2))
      next(
        reportDuplicates(
          (await isDuplicate(source, this, v2, query))
            ? v2
            : [],
        ),
      );
  });
