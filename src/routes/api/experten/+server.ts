/**
 * Die angelegten Expertenprofile als Liste.
 *
 * Gelesen wird der Profilordner des Harness. Jedes Profil hat eine profile.yaml mit Name
 * und Beschreibung, das genuegt fuer die Anzeige. Der Browser sieht nur diese zwei Felder.
 */
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { json } from '@sveltejs/kit';
import { tuerAktiv } from '$lib/server/tuer';
import { MUSTER_EXPERTEN } from '$lib/server/muster';

type Profil = { name: string; beschreibung: string };

const ORDNER = join(homedir(), '.hermes', 'profiles');

function beschreibungLesen(inhalt: string): string {
	const m = /^description:[ \t]*([\s\S]*?)(?=\n[a-zA-Z_]+:|\Z)/m.exec(inhalt);
	if (!m) return '';
	return m[1]
		.replace(/['"]/g, '')
		.split('\n')
		.map((z) => z.trim())
		.filter(Boolean)
		.join(' ')
		.trim();
}

export async function GET() {
	// Case 3: no door, so no cookie can ever be issued. Answer built-in
	// example profiles without touching ~/.hermes/profiles. The real read
	// below only runs once the door is active and the cookie is valid.
	if (!tuerAktiv()) return json({ experten: MUSTER_EXPERTEN });
	try {
		const eintraege = await readdir(ORDNER, { withFileTypes: true });
		const experten: Profil[] = [];
		for (const e of eintraege) {
			if (!e.isDirectory()) continue;
			let beschreibung = '';
			try {
				beschreibung = beschreibungLesen(await readFile(join(ORDNER, e.name, 'profile.yaml'), 'utf8'));
			} catch {
				beschreibung = '';
			}
			experten.push({ name: e.name, beschreibung });
		}
		experten.sort((a, b) => a.name.localeCompare(b.name));
		return json({ experten });
	} catch (e) {
		return json({ experten: [], fehler: (e as Error).message });
	}
}
