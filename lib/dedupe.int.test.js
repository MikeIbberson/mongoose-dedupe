const mongoose = require('mongoose');
const plugin = require('.');

const Schema = new mongoose.Schema({
  email: {
    dedupe: true,
    type: String,
    lowercase: true,
  },
  age: {
    dedupeWith: true,
    type: Number,
  },
  color: {
    type: String,
    dedupeWith: true,
  },
  active: {
    type: Boolean,
  },
  items: [
    {
      product: {
        type: String,
        distinct: true,
      },
      quantity: {
        type: Number,
        accumulate: true,
        default: 0,
      },
      other: {
        type: String,
        merge: true,
        default: 0,
      },
    },
  ],
  strictItems: [
    {
      product: {
        type: String,
        distinct: true,
      },
      quantity: {
        type: Number,
        default: 0,
      },
      other: {
        type: String,
        default: 0,
      },
    },
  ],
});

const Schema2 = new mongoose.Schema({
  title: {
    type: String,
    dedupe: true,
  },
});

Schema.plugin(plugin, { options: { active: true } });

const Model = mongoose.model('dedupe-plugin', Schema);
const ModelDiscriminated = Model.discriminator(
  'dedupe-plugin-discriminated',
  Schema2,
);

describe('Dedupe plugin', () => {
  beforeAll(async () => {
    mongoose.connect(process.env.CONNECTION, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Model.create({
      email: 'mibberson@3merge.ca',
      active: false,
    });
  });

  describe('unique props', () => {
    it('should create and update safely if inactive', async () => {
      const { _id } = await Model.create({
        email: 'mibberson@3merge.ca',
        active: true,
      });

      const doc = await Model.findById(_id);
      return expect(doc.save()).resolves.toEqual(
        expect.any(Object),
      );
    });

    it('should fail due to prior test', () =>
      expect(
        Model.create({
          email: 'Mibberson@3merge.ca',
        }),
      ).rejects.toMatchObject({
        errors: {
          email: expect.any(Object),
        },
      }));

    it('should pass without all conditions', () =>
      expect(
        Model.create({
          active: true,
          age: 22,
          color: 'green',
        }),
      ).resolves.toEqual(expect.any(Object)));

    it('should fail with combined conditions conditions', () =>
      expect(
        Model.create({
          age: 22,
          color: 'green',
        }),
      ).rejects.toMatchObject({
        errors: {
          age: expect.any(Object),
          color: expect.any(Object),
        },
      }));

    it('should merge with matched sub document', () =>
      expect(
        Model.create({
          items: [
            {
              product: 'Grill',
              quantity: 3,
              other: 'STOVE',
            },
            {
              product: 'Grill',
              quantity: 1,
              other: 'BBQ',
            },
          ],
        }),
      ).resolves.toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            product: 'Grill',
            quantity: 4,
            other: 'BBQ',
          }),
        ]),
      }));

    it('should fail with duplicate sub documents', () =>
      expect(
        Model.create({
          strictItems: [
            {
              product: 'Grill',
            },
            {
              product: 'Grill',
            },
          ],
        }),
      ).rejects.toThrowError());
  });

  it('should block discriminated values', async () => {
    const args = {
      title: 'Foo',
      active: true,
    };
    await ModelDiscriminated.create(args);

    return expect(
      ModelDiscriminated.create(args),
    ).rejects.toThrowError();
  });

  it('should consider case sensitivity', async () => {
    await ModelDiscriminated.create({
      title: 'One',
      active: true,
    });

    return expect(
      ModelDiscriminated.create({
        title: 'ONE',
        active: true,
      }),
    ).rejects.toThrowError();
  });
});
