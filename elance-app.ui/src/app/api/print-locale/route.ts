import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// NOTE: Absolute path to print-ar.json resolved from the Next.js project root (process.cwd()).
// This file holds all print document labels and Arabic company info used by print components.
const LOCALE_FILE_PATH = path.join(process.cwd(), 'src', 'locales', 'print-ar.json');

/**
 * GET /api/print-locale
 * Returns the current contents of print-ar.json as a parsed JSON object.
 */
export async function GET() {
  try {
    const raw = fs.readFileSync(LOCALE_FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[print-locale] Failed to read locale file:', error);
    return NextResponse.json({ error: 'Impossible de lire le fichier de configuration.' }, { status: 500 });
  }
}

/**
 * PUT /api/print-locale
 * Accepts the full updated JSON object in the request body and writes it back to disk.
 * Persists changes immediately — no .NET backend or database involved.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Corps de la requête invalide.' }, { status: 400 });
    }

    // NOTE: Pretty-print with 2-space indent to keep the file human-readable.
    fs.writeFileSync(LOCALE_FILE_PATH, JSON.stringify(body, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: 'Configuration mise à jour avec succès.' });
  } catch (error) {
    console.error('[print-locale] Failed to write locale file:', error);
    return NextResponse.json({ error: 'Impossible d\'enregistrer la configuration.' }, { status: 500 });
  }
}
