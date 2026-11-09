// src/back-end/backend-cli.ts
import { Command } from 'commander';
import { pathToFileURL } from 'node:url';
import { initDatabase, DEFAULT_DB_PATH } from './db/database.ts';

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
    .action((options) => {
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
