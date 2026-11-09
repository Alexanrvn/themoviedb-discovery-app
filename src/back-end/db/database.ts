// src/back-end/db/database.ts
import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';
import * as fs from 'node:fs';

export const DEFAULT_DB_PATH = path.resolve(
  process.cwd(),
  'data/movies.sqlite',
);

export function initDatabase(dbPath: string = DEFAULT_DB_PATH): DatabaseSync {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  // Activation explicite des clés étrangères dans SQLite
  db.exec('PRAGMA foreign_keys = ON;');

  // Exécution dans une transaction atomic pour rollback sur erreur
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS genre (
        id_tmdb INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );`);

    db.exec(`CREATE TABLE IF NOT EXISTS country (
        iso_code TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );`);

    db.exec(`CREATE TABLE IF NOT EXISTS movie (
        id_tmdb INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        release_date TEXT,
        -- Année calculée automatiquement à partir de la date (YYYY)
        release_year INTEGER GENERATED ALWAYS AS (
          CAST(strftime('%Y', release_date) AS INTEGER)
        ) STORED,
        overview TEXT,
        vote_average REAL,
        vote_count INTEGER,
        popularity REAL,
        -- Contraintes strictes sur les durées, budgets et recettes (> 0)
        runtime INTEGER CHECK (runtime IS NULL OR runtime > 0),
        budget INTEGER CHECK (budget IS NULL OR budget > 0),
        revenue INTEGER CHECK (revenue IS NULL OR revenue > 0),
        observation_date TEXT DEFAULT CURRENT_TIMESTAMP
      );`);

    db.exec(`CREATE TABLE IF NOT EXISTS movie_genre (
        movie_id INTEGER REFERENCES movie(id_tmdb) ON DELETE CASCADE,
        genre_id INTEGER REFERENCES genre(id_tmdb) ON DELETE CASCADE,
        PRIMARY KEY (movie_id, genre_id)
      );`);

    db.exec(`CREATE TABLE IF NOT EXISTS movie_country (
        movie_id INTEGER REFERENCES movie(id_tmdb) ON DELETE CASCADE,
        country_iso TEXT REFERENCES country(iso_code) ON DELETE CASCADE,
        PRIMARY KEY (movie_id, country_iso)
      );`);

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    db.close();
    throw error; // Propagation de l'erreur
  }

  return db;
}
