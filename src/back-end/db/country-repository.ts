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
      CREATE TABLE IF NOT EXISTS countries (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
  }

  findAll(): Country[] {
    const stmt = this.db.prepare(
      'SELECT code, name FROM countries ORDER BY code ASC',
    );
    return stmt.all() as unknown as Country[];
  }

  findByCode(code: string): Country | undefined {
    const stmt = this.db.prepare(
      'SELECT code, name FROM countries WHERE code = ?',
    );
    return stmt.get(code) as Country | undefined;
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
            INSERT INTO countries (code, name)
            VALUES (?, ?)
            ON CONFLICT(code) DO UPDATE SET name = excluded.name
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
}
