/**
 * Das Kanban-Board des Harness als JSON fuer die Oberflaeche.
 *
 * Laeuft auf dem Server der App, weil dort das Kommandozeilenwerkzeug des Harness
 * erreichbar ist. Der Browser bekommt nur Titel, Zustand, Rolle und Ergebnis.
 */
import { execFile } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';
import { json } from '@sveltejs/kit';
import { tuerAktiv } from '$lib/server/tuer';
import { MUSTER_AUFGABEN } from '$lib/server/muster';

const lauf = promisify(execFile);

/** Message for a machine without the Hermes CLI on PATH and without HERMES_BIN. */
const NICHT_GEFUNDEN = 'hermes CLI nicht gefunden. HERMES_BIN setzen.';

/**
 * Resolve the Hermes CLI without any hardcoded home directory.
 *
 * HERMES_BIN wins when set. Otherwise the first executable named `hermes`
 * on PATH is used, the same way a shell would find it.
 */
function klingeFinden(): string | null {
	const ausUmgebung = (process.env.HERMES_BIN ?? '').trim();
	if (ausUmgebung) return ausUmgebung;
	for (const ordner of (process.env.PATH ?? '').split(delimiter)) {
		if (!ordner) continue;
		const kandidat = join(ordner, 'hermes');
		try {
			accessSync(kandidat, constants.X_OK);
			return kandidat;
		} catch {
			/* Not executable here; try the next PATH entry. */
		}
	}
	return null;
}

type RoheAufgabe = Record<string, unknown>;

function text(wert: unknown): string {
	return typeof wert === 'string' ? wert : wert === null || wert === undefined ? '' : String(wert);
}

function zahlZuZeit(wert: unknown): string {
	const n = Number(wert);
	if (!n) return '';
	const d = new Date(n * 1000);
	return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function GET() {
	// Case 3: no door, so no cookie can ever be issued. Answer built-in
	// examples without looking for the CLI or starting a process. The real
	// path below only runs once the door is active and the cookie is valid.
	if (!tuerAktiv()) return json({ aufgaben: MUSTER_AUFGABEN });
	const klinge = klingeFinden();
	if (!klinge) return json({ aufgaben: [], fehler: NICHT_GEFUNDEN });
	try {
		const { stdout } = await lauf(klinge, ['kanban', 'list', '--json'], {
			timeout: 20000,
			maxBuffer: 4 * 1024 * 1024
		});
		const roh = JSON.parse(stdout || '[]');
		const liste: RoheAufgabe[] = Array.isArray(roh)
			? (roh as RoheAufgabe[])
			: ((roh.tasks ?? roh.data ?? []) as RoheAufgabe[]);
		const aufgaben = liste.map((t) => ({
			id: text(t.id),
			titel: text(t.title),
			zustand: text(t.status) || 'todo',
			rolle: text(t.assignee),
			ergebnis: text(t.summary ?? t.result),
			erstellt: zahlZuZeit(t.created_at),
			eltern: Array.isArray(t.parent_ids) ? (t.parent_ids as string[]).map(text) : []
		}));
		return json({ aufgaben });
	} catch (e) {
		// A missing binary must read as a clear instruction, not as a raw ENOENT.
		const roh = e as NodeJS.ErrnoException;
		if (roh?.code === 'ENOENT') return json({ aufgaben: [], fehler: NICHT_GEFUNDEN });
		return json({ aufgaben: [], fehler: (e as Error).message });
	}
}
