/**
 * Die Routinen des Harness als JSON fuer die Oberflaeche.
 *
 * Gelesen wird die Auftragsliste des Harness (`~/.hermes/cron/jobs.json`), nicht
 * die Kommandozeile: die Liste liegt als Datei vor und ist damit auch dann
 * lesbar, wenn im Container keine CLI installiert ist. Ein anderer Ort laesst
 * sich ueber CRON_ORDNER setzen.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { tuerAktiv } from '$lib/server/tuer';
import { MUSTER_ROUTINEN } from '$lib/server/muster';
import { alsListe, alsRoutine } from '$lib/server/routinen';

/** Klartext statt roher Fehlermeldung, wenn die Liste fehlt. */
const NICHT_GEFUNDEN = 'Auftragsliste nicht gefunden. CRON_ORDNER setzen.';

export async function GET() {
	// `beispiel` marks the origin of the answer for the interface: true means the
	// built-in examples, false means real data or an error. Without a door no
	// cookie can be issued, so the route answers examples instead of staying
	// closed forever.
	if (!tuerAktiv()) return json({ routinen: MUSTER_ROUTINEN, beispiel: true });

	const ordner = (env.CRON_ORDNER ?? '').trim() || join(homedir(), '.hermes', 'cron');
	try {
		const roh = JSON.parse(await readFile(join(ordner, 'jobs.json'), 'utf8'));
		const routinen = alsListe(roh).map(alsRoutine);
		return json({ routinen, beispiel: false });
	} catch (e) {
		if ((e as NodeJS.ErrnoException)?.code === 'ENOENT')
			return json({ routinen: [], fehler: NICHT_GEFUNDEN, beispiel: false });
		return json({ routinen: [], fehler: (e as Error).message, beispiel: false });
	}
}
