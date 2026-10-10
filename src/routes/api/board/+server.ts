/**
 * Das Kanban-Board des Harness als JSON fuer die Oberflaeche.
 *
 * Laeuft auf dem Server der App, weil dort das Kommandozeilenwerkzeug des Harness
 * erreichbar ist. Der Browser bekommt nur Titel, Zustand, Rolle und Ergebnis.
 * Die Arbeit steckt in $lib/server/lesen.ts.
 */
import { json } from '@sveltejs/kit';
import { tuerAktiv } from '$lib/server/tuer';
import { aufgabenLesen } from '$lib/server/lesen';
import { MUSTER_AUFGABEN } from '$lib/server/muster';

export async function GET() {
	// `beispiel` marks the origin of the answer for the interface: true means the
	// built-in examples, false means real data or an error. The other fields stay
	// untouched so existing callers keep working. Without a door no cookie can
	// ever be issued, so the route answers examples.
	if (!tuerAktiv()) return json({ aufgaben: MUSTER_AUFGABEN, beispiel: true });

	const { aufgaben, fehler } = await aufgabenLesen();
	return json({ aufgaben, fehler: fehler ?? undefined, beispiel: false });
}
