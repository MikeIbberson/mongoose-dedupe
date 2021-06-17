jest.mock('mongoose', () => ({
  connection: {
    db: {
      collection: jest.fn(),
    },
  },
}));

const mongoose = require('mongoose');
const {
  eitherOr,
  isDuplicate,
  getDuplicateFields,
  getOption,
} = require('./helpers');

describe('Plugin helpers', () => {
  describe('"either or"', () => {
    it('should return first argument', () =>
      expect(eitherOr(1, 2)).toBe(1));

    it('should return second argument', () =>
      expect(eitherOr(null, 2)).toBe(2));

    it('should return undefined', () =>
      expect(eitherOr()).toBe(undefined));
  });

  describe('"getUniqueOptions"', () => {
    const eachPath = jest.fn().mockImplementation((v) => {
      v('foo', {
        options: { dedupeWith: true },
      });
      v('bar', {
        options: { dedupe: true },
      });
    });

    it('should return array of unique values', () =>
      expect(
        getOption(
          {
            eachPath,
          },
          'dedupe',
        ),
      ).toEqual(['bar']));

    it('should return array of unique values', () =>
      expect(
        getOption(
          {
            eachPath,
          },
          'dedupeWith',
        ),
      ).toEqual(['foo']));
  });

  describe('"isDuplicate"', () => {
    it('should call countDocuments from mongoose', (done) => {
      const stub = { foo: 1, bar: 1 };
      const countDocuments = jest.fn().mockResolvedValue(0);

      mongoose.connection.db.collection.mockReturnValue({
        countDocuments,
      });

      isDuplicate(
        {
          collection: {
            collectionName: 'foo',
          },
        },
        stub,
        ['foo', 'bar'],
      ).then(() => {
        expect(countDocuments).toHaveBeenCalledWith(stub);
        expect(
          mongoose.connection.db.collection,
        ).toHaveBeenCalledWith('foo');

        done();
      });
    });

    it('should call countDocuments on model', (done) => {
      const stub = { foo: 1, bar: 1 };
      const countDocuments = jest.fn().mockResolvedValue(0);

      isDuplicate({ countDocuments }, stub, [
        'foo',
        'bar',
      ]).then(() => {
        expect(countDocuments).toHaveBeenCalledWith(stub);
        done();
      });
    });

    it('should return false', () =>
      expect(isDuplicate({}, [])).resolves.toBeFalsy());
  });

  describe('"getDuplicateFields"', () => {
    it('should call countDocuments', (done) => {
      const stub = { foo: 1, bar: 1 };
      const countDocuments = jest
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      getDuplicateFields({ countDocuments }, stub, [
        'foo',
        'bar',
      ]).then((res) => {
        expect(countDocuments).toHaveBeenCalledWith({
          foo: 1,
        });
        expect(countDocuments).toHaveBeenCalledWith({
          bar: 1,
        });
        expect(res).toEqual(['bar']);
        done();
      });
    });
  });
});
