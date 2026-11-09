import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runBackendCli,
  runBackendCliIfMain,
} from '../src/back-end/backend-cli.js';
import { initDatabase } from '../src/back-end/db/database.js';

const temporaryDirectories: string[] = [];
const cliPath = fileURLToPath(
  new URL('../src/back-end/backend-cli.ts', import.meta.url),
);

function createTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'movies-db-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of temporaryDirectories) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.length = 0;
});

describe('Schéma SQLite et initialisation [DASHBOARD-02]', () => {
  it('crée les tables et calcule l’année de sortie', () => {
    // Vérifie la structure générée ainsi que l’insertion d’un film valide.
    const dbPath = path.join(
      createTemporaryDirectory(),
      'nested',
      'movies.sqlite',
    );
    const db = initDatabase(dbPath);

    try {
      db.exec(
        "INSERT INTO movie (id_tmdb, title, release_date, runtime) VALUES (1, 'Test', '2023-05-10', 120);",
      );

      const row = db
        .prepare('SELECT release_year, runtime FROM movie WHERE id_tmdb = 1')
        .get() as { release_year: number; runtime: number };
      expect(row).toEqual({ release_year: 2023, runtime: 120 });
    } finally {
      db.close();
    }
  });

  it('refuse les doublons de relation et les références étrangères invalides', () => {
    // Vérifie l’unicité des associations et l’activation effective des clés étrangères.
    const db = initDatabase(
      path.join(createTemporaryDirectory(), 'movies.sqlite'),
    );

    try {
      db.exec(`
        INSERT INTO movie (id_tmdb, title) VALUES (1, 'Test');
        INSERT INTO genre (id_tmdb, name) VALUES (10, 'Drama');
        INSERT INTO country (iso_code, name) VALUES ('FR', 'France');
        INSERT INTO movie_genre (movie_id, genre_id) VALUES (1, 10);
        INSERT INTO movie_country (movie_id, country_iso) VALUES (1, 'FR');
      `);

      expect(() => {
        db.exec('INSERT INTO movie_genre (movie_id, genre_id) VALUES (1, 10);');
      }).toThrow();
      expect(() => {
        db.exec(
          "INSERT INTO movie_country (movie_id, country_iso) VALUES (1, 'FR');",
        );
      }).toThrow();
      expect(() => {
        db.exec('INSERT INTO movie_genre (movie_id, genre_id) VALUES (2, 10);');
      }).toThrow();
      expect(() => {
        db.exec(
          "INSERT INTO movie_country (movie_id, country_iso) VALUES (1, 'XX');",
        );
      }).toThrow();
      expect(
        (db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number })
          .foreign_keys,
      ).toBe(1);
    } finally {
      db.close();
    }
  });

  it('refuse les durées, budgets et recettes nuls ou négatifs', () => {
    // Vérifie les trois contraintes de positivité sans interdire les valeurs absentes.
    const db = initDatabase(
      path.join(createTemporaryDirectory(), 'movies.sqlite'),
    );

    try {
      db.exec("INSERT INTO movie (id_tmdb, title) VALUES (1, 'Test');");

      for (const column of ['runtime', 'budget', 'revenue']) {
        for (const value of [0, -1]) {
          expect(() => {
            db.exec(
              `INSERT INTO movie (id_tmdb, title, ${column}) VALUES (2, 'Invalid', ${value});`,
            );
          }).toThrow();
        }
      }
      expect(
        db
          .prepare(
            'SELECT runtime, budget, revenue FROM movie WHERE id_tmdb = 1',
          )
          .get(),
      ).toEqual({ runtime: null, budget: null, revenue: null });
    } finally {
      db.close();
    }
  });

  it('annule tous les changements si la création du schéma échoue', () => {
    // L’erreur injectée après CREATE genre doit annuler ce premier changement.
    const dbPath = path.join(createTemporaryDirectory(), 'movies.sqlite');
    const seedDb = new DatabaseSync(dbPath);
    seedDb.exec('CREATE TABLE seed (id INTEGER PRIMARY KEY);');
    seedDb.close();

    const originalExec = DatabaseSync.prototype.exec;
    vi.spyOn(DatabaseSync.prototype, 'exec').mockImplementation(function (
      this: DatabaseSync,
      sql: string,
    ) {
      if (sql.includes('CREATE TABLE IF NOT EXISTS country')) {
        throw new Error('Injected DDL failure');
      }
      originalExec.call(this, sql);
    });

    expect(() => initDatabase(dbPath)).toThrow('Injected DDL failure');

    const db = new DatabaseSync(dbPath);
    try {
      expect(
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'genre'",
          )
          .get(),
      ).toBeUndefined();
      expect(
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'seed'",
          )
          .get(),
      ).toEqual({ name: 'seed' });
    } finally {
      db.close();
    }
  });

  it('initialise la base au chemin par défaut du CLI', () => {
    // Le cwd temporaire isole le chemin par défaut de toute base de données existante.
    const cwd = createTemporaryDirectory();
    const result = spawnSync(process.execPath, [cliPath], {
      cwd,
      encoding: 'utf8',
    });
    const dbPath = path.join(cwd, 'data', 'movies.sqlite');

    expect(result.status).toBe(0);
    expect(fs.existsSync(dbPath)).toBe(true);

    const db = new DatabaseSync(dbPath);
    try {
      expect(
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'movie'",
          )
          .get(),
      ).toEqual({ name: 'movie' });
    } finally {
      db.close();
    }
  });

  it('initialise la base au chemin fourni avec --path', () => {
    // Vérifie qu’un chemin explicite est interprété depuis le cwd du processus.
    const cwd = createTemporaryDirectory();
    const dbPath = path.join(cwd, 'custom-movies.sqlite');
    const result = spawnSync(
      process.execPath,
      [cliPath, '--path', './custom-movies.sqlite'],
      { cwd, encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(fs.existsSync(dbPath)).toBe(true);

    const db = new DatabaseSync(dbPath);
    try {
      expect(
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'movie'",
          )
          .get(),
      ).toEqual({ name: 'movie' });
    } finally {
      db.close();
    }
  });

  it('exécute le CLI quand son module est le point d’entrée', () => {
    // Exerce la branche normalement déclenchée par l’exécution directe avec Node.
    const dbPath = path.join(createTemporaryDirectory(), 'direct.sqlite');

    runBackendCliIfMain(cliPath, pathToFileURL(cliPath).href, [
      'node',
      'backend-cli',
      '--path',
      dbPath,
    ]);

    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('signale une erreur si le chemin SQLite ne peut pas être ouvert', () => {
    // Vérifie que le CLI journalise l’échec et termine avec un code non nul.
    const cwd = createTemporaryDirectory();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as never);

    expect(() => runBackendCli(['node', 'backend-cli', '--path', cwd])).toThrow(
      'process.exit',
    );
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
