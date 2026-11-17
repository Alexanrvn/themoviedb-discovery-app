import { parse } from 'csv-parse/sync';
import type { Country } from '../db/country-repository';

const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

export function parseCountriesCsv(fileContent: string): Country[] {
  const records = parse(fileContent, {
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as string[][];

  if (records.length === 0) {
    throw new Error(
      "Le fichier CSV est vide : les en-têtes 'code' et 'name' sont requis.",
    );
  }

  const headers = records[0].map((h) => h.toLowerCase());
  if (
    headers.length !== 2 ||
    !headers.includes('code') ||
    !headers.includes('name')
  ) {
    throw new Error(
      "Les en-têtes CSV doivent contenir uniquement 'code' et 'name'.",
    );
  }

  // Un document contenant uniquement les en-têtes renvoie une liste vide
  if (records.length === 1) {
    return [];
  }

  const codeIndex = headers.indexOf('code');
  const nameIndex = headers.indexOf('name');
  const countries: Country[] = [];

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    const code = row[codeIndex];
    const name = row[nameIndex];

    if (!code || !COUNTRY_CODE_REGEX.test(code)) {
      throw new Error(
        `Code pays invalide à la ligne ${i + 1} : "${code}" (deux lettres majuscules attendues).`,
      );
    }

    if (!name || name.trim() === '') {
      throw new Error(`Nom de pays obligatoire manquant à la ligne ${i + 1}.`);
    }

    countries.push({ code, name: name.trim() });
  }

  return countries;
}
