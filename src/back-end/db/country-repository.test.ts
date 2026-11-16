import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { CountryRepository } from './country-repository';

describe('CountryRepository', () => {
  let db: DatabaseSync;
  let repository: CountryRepository;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    repository = new CountryRepository(db);
  });

  test('La recherche par code renvoie le pays ou undefined', () => {
    assert.strictEqual(repository.findByCode('XX'), undefined);
    repository.upsertAll([{ code: 'FR', name: 'France' }]);

    const result = repository.findByCode('FR');
    assert.strictEqual(result?.code, 'FR');
    assert.strictEqual(result?.name, 'France');
  });

  test('La liste renvoie une liste vide ou les pays triés par code croissant', () => {
    assert.deepStrictEqual(repository.findAll(), []);

    repository.upsertAll([
      { code: 'US', name: 'United States' },
      { code: 'FR', name: 'France' },
      { code: 'JP', name: 'Japan' },
    ]);

    const list = repository.findAll();
    assert.deepStrictEqual(
      list.map((c) => c.code),
      ['FR', 'JP', 'US'],
    );
  });

  test('Un itérable vide ne modifie pas les données', () => {
    repository.upsertAll(new Set());
    assert.strictEqual(repository.findAll().length, 0);
  });

  test('La mise à jour et les codes répétés conservent le dernier libellé sans doublon', () => {
    repository.upsertAll([
      { code: 'FR', name: 'France' },
      { code: 'FR', name: 'République française' },
    ]);

    let list = repository.findAll();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].name, 'République française');

    repository.upsertAll([{ code: 'FR', name: 'France' }]);
    list = repository.findAll();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].name, 'France');
  });

  test('Accepte d’autres itérables comme un Map ou un Set', () => {
    const countryMap = new Map();
    countryMap.set(1, { code: 'DE', name: 'Germany' });

    repository.upsertAll(countryMap.values());
    assert.strictEqual(repository.findByCode('DE')?.name, 'Germany');
  });
});
