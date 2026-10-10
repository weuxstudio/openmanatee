/**
 * Die Routinen des Harness als JSON fuer die Oberflaeche.
 *
 * Gelesen wird die Auftragsliste auf dieser Maschine; die Arbeit steckt in
 * $lib/server/lesen.ts, damit die Startseite dieselben Zahlen zeigt.
 */
import { json } from '@sveltejs/kit';
import { tuerAktiv } from '$lib/server/tuer';
import { routinenLesen } from '$lib/server/lesen';
import { MUSTER_ROUTINEN } from '$lib/server/muster';

export async function GET() {
	// `beispiel` marks the origin of the answer for the interface: true means the
	// built-in examples, false means real data or an error. Without a door no
	// cookie can be issued, so the route answers examples instead of staying
	// closed forever.
	if (!tuerAktiv()) return json({ routinen: MUSTER_ROUTINEN, beispiel: true });

	const { routinen, fehler } = await routinenLesen();
	return json({ routinen, fehler: fehler ?? undefined, beispiel: false });
}
