// src/back-end/backend-cli.ts
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import { parseCountriesCsv } from './csv/country-parser.ts';
import { CountryRepository } from './db/country-repository.ts';
import { initDatabase, DEFAULT_DB_PATH } from './db/database.ts';

export function handleAddCountries(csvFilePath: string, dbPath: string): void {
  const absoluteCsvPath = path.resolve(csvFilePath);

  // 1. Validation du CSV avant toute ouverture de la base
  const content = fs.readFileSync(absoluteCsvPath, 'utf-8');
  const countries = parseCountriesCsv(content);

  // 2. Ouverture avec schéma initialisé, import transactionnel et fermeture garantie
  const db = initDatabase(dbPath);
  try {
    const repo = new CountryRepository(db);
    repo.upsertAll(countries);
    console.log(
      `Import réussi : ${countries.length} pays importé(s) dans ${dbPath}`,
    );
  } finally {
    db.close();
  }
}

export function handleCleanCountries(dbPath: string): void {
  const db = initDatabase(dbPath);
  try {
    const repo = new CountryRepository(db);
    const deletedCount = repo.deleteUnusedCountries();
    console.log(
      `Nettoyage réussi : ${deletedCount} pays inutilisé(s) supprimé(s) de ${dbPath}`,
    );
  } finally {
    db.close();
  }
}

export function runBackendCli(args: string[] = process.argv): void {
  const program = new Command();

  program
    .name('backend-cli')
    .description('CLI pour la gestion de la base de données de films')
    .option(
      '-p, --path <path>',
      "Chemin d'accès au fichier SQLite",
      DEFAULT_DB_PATH,
    )
    .action((options: { path: string }) => {
      try {
        console.log(`Initialisation de la base de données : ${options.path}`);
        const db = initDatabase(options.path);
        db.close();
        console.log('Base de données initialisée avec succès.');
      } catch (error) {
        console.error(
          "Échec de l'initialisation de la base de données :",
          error,
        );
        process.exit(1);
      }
    });

  program
    .command('add-countries <csv-file>')
    .description('Importe ou met à jour des pays depuis un fichier CSV')
    .option('-p, --path <path>', "Chemin d'accès au fichier SQLite")
    .action((csvFile: string, _options: unknown, command: Command) => {
      const { path: dbPath } = command.optsWithGlobals<{ path: string }>();
      try {
        handleAddCountries(csvFile, dbPath);
      } catch (error) {
        console.error("Échec de l'import des pays :", error);
        process.exit(1);
      }
    });

  program
    .command('clean-countries')
    .description('Supprime les pays inutilisés de la base de données')
    .option('-p, --path <path>', "Chemin d'accès au fichier SQLite")
    .action((_options: unknown, command: Command) => {
      const { path: dbPath } = command.optsWithGlobals<{ path: string }>();
      try {
        handleCleanCountries(dbPath);
      } catch (error) {
        console.error('Échec du nettoyage des pays :', error);
        process.exit(1);
      }
    });

  program.parse(args);
}

export function runBackendCliIfMain(
  scriptPath: string | undefined = process.argv[1],
  moduleUrl: string = import.meta.url,
  args: string[] = process.argv,
): void {
  if (scriptPath && moduleUrl === pathToFileURL(scriptPath).href) {
    runBackendCli(args);
  }
}

runBackendCliIfMain();
