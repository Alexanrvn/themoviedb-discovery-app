import { DatabaseSync } from 'node:sqlite';

export interface Genre {
  id: number;
  name: string;
}

export class GenreRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS genres (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
  }

  findById(id: number): Genre | undefined {
    const stmt = this.db.prepare('SELECT id, name FROM genres WHERE id = ?');
    return stmt.get(id) as Genre | undefined;
  }

  findAll(): Genre[] {
    const stmt = this.db.prepare('SELECT id, name FROM genres ORDER BY id ASC');
    return stmt.all().map((row): Genre => ({
      id: row.id as number,
      name: row.name as string,
    }));
  }

  upsertAll(genres: Iterable<Genre>): void {
    // Vérification rapide pour un itérable vide sans le consommer entièrement
    const iterator = genres[Symbol.iterator]();
    if (iterator.next().done) return;

    const stmt = this.db.prepare(`
      INSERT INTO genres (id, name)
      VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `);

    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const genre of genres) {
        if (!genre.name || genre.name.trim() === '') {
          throw new Error('La contrainte de nom est obligatoire');
        }
        stmt.run(genre.id, genre.name);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
