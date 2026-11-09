import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { GenreRepository } from './genre-repository';

describe('GenreRepository', () => {
  let db: DatabaseSync;
  let repository: GenreRepository;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    repository = new GenreRepository(db);
  });

  test('La recherche par identifiant renvoie le genre ou undefined', () => {
    assert.strictEqual(repository.findById(99), undefined); // Absent
    repository.upsertAll([{ id: 1, name: 'Action' }]);

    // Présent : On vérifie les valeurs pour ignorer le "null prototype" de node:sqlite
    const result = repository.findById(1);
    assert.strictEqual(result?.id, 1);
    assert.strictEqual(result?.name, 'Action');
  });

  test('La liste renvoie les genres triés par identifiant croissant', () => {
    repository.upsertAll([
      { id: 3, name: 'Drama' },
      { id: 1, name: 'Action' },
      { id: 2, name: 'Comedy' },
    ]);
    const list = repository.findAll();
    assert.deepStrictEqual(
      list.map((g) => g.id),
      [1, 2, 3],
    );
  });

  test('L’insertion accepte un itérable vide sans modifier les données', () => {
    repository.upsertAll(new Set());
    assert.strictEqual(repository.findAll().length, 0);
  });

  test('Si un identifiant apparaît plusieurs fois, le dernier libellé fourni est conservé', () => {
    repository.upsertAll([
      { id: 1, name: 'Action' },
      { id: 1, name: 'Action & Adventure' },
    ]);
    const list = repository.findAll();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].name, 'Action & Adventure');
  });

  test('L’insertion ou la mise à jour accepte un itérable (ex: Set) de genres', () => {
    const genreSet = new Set([{ id: 12, name: 'Adventure' }]);
    repository.upsertAll(genreSet);
    assert.strictEqual(repository.findById(12)?.name, 'Adventure');
  });

  test('La contrainte de nom obligatoire lève une erreur et annule la transaction', () => {
    assert.throws(() => {
      repository.upsertAll([{ id: 1, name: '' }]);
    });
    assert.strictEqual(repository.findAll().length, 0);
  });
});
