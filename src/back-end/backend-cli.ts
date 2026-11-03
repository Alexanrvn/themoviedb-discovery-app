// src/back-end/backend-cli.ts
import { Command } from 'commander';
import { initDatabase, DEFAULT_DB_PATH } from './db/database.js';

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
      initDatabase(options.path);
      console.log('Base de données initialisée avec succès.');
    } catch (error) {
      console.error("Échec de l'initialisation de la base de données :", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
