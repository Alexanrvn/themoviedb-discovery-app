// src/back-end/db/country-repository.ts
import { DatabaseSync } from 'node:sqlite';

export interface Country {
  code: string;
  name: string;
}

export class CountryRepository {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS country (
        iso_code TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
  }

  findByCode(code: string): Country | undefined {
    const stmt = this.db.prepare(
      'SELECT iso_code AS code, name FROM country WHERE iso_code = ?',
    );
    return stmt.get(code) as Country | undefined;
  }

  findAll(): Country[] {
    const stmt = this.db.prepare(
      'SELECT iso_code AS code, name FROM country ORDER BY iso_code ASC',
    );
    return stmt.all() as unknown as Country[];
  }

  upsertAll(countries: Iterable<Country>): void {
    let stmt: ReturnType<DatabaseSync['prepare']> | null = null;
    let transactionStarted = false;

    try {
      for (const country of countries) {
        if (!transactionStarted) {
          this.db.exec('BEGIN IMMEDIATE');
          transactionStarted = true;
          stmt = this.db.prepare(`
            INSERT INTO country (iso_code, name)
            VALUES (?, ?)
            ON CONFLICT(iso_code) DO UPDATE SET name = excluded.name
          `);
        }

        if (!country.code || country.code.trim() === '') {
          throw new Error('Le code du pays est obligatoire');
        }
        if (!country.name || country.name.trim() === '') {
          throw new Error('Le nom du pays est obligatoire');
        }

        stmt!.run(country.code, country.name);
      }

      if (transactionStarted) {
        this.db.exec('COMMIT');
      }
    } catch (error) {
      if (transactionStarted) {
        this.db.exec('ROLLBACK');
      }
      throw error;
    }
  }

  deleteUnusedCountries(): number {
    const hasMovieCountry = this.db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'movie_country'",
      )
      .get();

    const stmt = hasMovieCountry
      ? this.db.prepare(`
          DELETE FROM country
          WHERE iso_code NOT IN (SELECT DISTINCT country_iso FROM movie_country)
        `)
      : this.db.prepare('DELETE FROM country');

    const result = stmt.run();
    return Number(result.changes);
  }
}
