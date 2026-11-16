import { parse } from 'csv-parse/sync';
import { Genre } from '../db/genre-repository';

export function parseGenresCsv(fileContent: string): Genre[] {
  // Parsing brut avec prise en charge du BOM UTF-8 et des lignes vides
  const records = parse(fileContent, {
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as string[][];

  if (records.length === 0) {
    throw new Error('Le fichier CSV est vide.');
  }

  // Validation des en-têtes (case-insensitive, n'importe quel ordre)
  const headers = records[0].map((h) => h.toLowerCase());
  if (
    headers.length !== 2 ||
    !headers.includes('id') ||
    !headers.includes('name')
  ) {
    throw new Error(
      "Les en-têtes CSV doivent contenir uniquement 'id' et 'name'.",
    );
  }

  const idIndex = headers.indexOf('id');
  const nameIndex = headers.indexOf('name');
  const genres: Genre[] = [];

  // Validation ligne par ligne
  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    const rawId = row[idIndex];
    const rawName = row[nameIndex];

    const idNumber = Number(rawId);

    // Validation entiers positifs et safe integer
    if (
      !rawId ||
      isNaN(idNumber) ||
      !Number.isInteger(idNumber) ||
      !Number.isSafeInteger(idNumber) ||
      idNumber <= 0
    ) {
      throw new Error(`Identifiant invalide à la ligne ${i + 1} : "${rawId}"`);
    }

    // Validation nom non vide
    if (!rawName || rawName.trim() === '') {
      throw new Error(`Nom obligatoire manquant à la ligne ${i + 1}`);
    }

    genres.push({ id: idNumber, name: rawName.trim() });
  }

  return genres;
}
