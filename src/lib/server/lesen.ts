/**
 * Alles, was die App von dieser Maschine liest, an einer Stelle.
 *
 * Drei Quellen: die Auftragsliste des Harness (Routinen), das Kanban-Board
 * (Aufgaben) und ein Ordner (Ergebnisse). Die Routen der drei Seiten und die
 * Startseite benutzen dieselben Funktionen, damit die Zahlen auf der Startseite
 * nicht anders aussehen als auf der Seite, zu der sie fuehren.
 *
 * English: one place for every host read. The routes stay thin wrappers so that
 * the start page and the pages it links to can never disagree.
 */
import { execFile } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';
import { env } from '$env/dynamic/private';
import { alsListe, alsRoutine, zeitZuText, type Routine } from '$lib/server/routinen';
import { groesseText } from '$lib/server/ablage';

const lauf = promisify(execFile);

/** Klartext statt roher Fehlermeldung, wenn etwas fehlt. */
export const KEINE_CRON_LISTE = 'Auftragsliste nicht gefunden. CRON_ORDNER setzen.';
export const KEIN_ORDNER =
	'Kein Ordner gesetzt. ABLAGE_ORDNER in der .env auf einen Ordner zeigen lassen.';
export const NICHT_GEFUNDEN = 'hermes CLI nicht gefunden. HERMES_BIN setzen.';

function text(wert: unknown): string {
	return typeof wert === 'string' ? wert : wert === null || wert === undefined ? '' : String(wert);
}

/* --------------------------------------------------------------- Routinen */

export type RoutinenStand = { routinen: Routine[]; fehler: string | null };

/** Auftragsliste des Harness: CRON_ORDNER, sonst ~/.hermes/cron/jobs.json. */
export async function routinenLesen(): Promise<RoutinenStand> {
	const ordner = (env.CRON_ORDNER ?? '').trim() || join(homedir(), '.hermes', 'cron');
	try {
		const roh = JSON.parse(await readFile(join(ordner, 'jobs.json'), 'utf8'));
		return { routinen: alsListe(roh).map(alsRoutine), fehler: null };
	} catch (e) {
		const roh = e as NodeJS.ErrnoException;
		return {
			routinen: [],
			fehler:
				roh?.code === 'ENOENT' ? KEINE_CRON_LISTE : roh?.code === 'ENOTDIR' ? KEINE_CRON_LISTE : (e as Error).message
		};
	}
}

/* ----------------------------------------------------------------- Ablage */

export type AblageDatei = {
	name: string;
	ordner: boolean;
	groesse: string;
	geaendert: string;
};

export type AblageStand = { dateien: AblageDatei[]; ordner: string; fehler: string | null };

/** Oberste Ebene des Ordners aus ABLAGE_ORDNER, neuestes zuerst. */
export async function ablageLesen(): Promise<AblageStand> {
	const ordner = (env.ABLAGE_ORDNER ?? '').trim();
	if (!ordner) return { dateien: [], ordner: '', fehler: KEIN_ORDNER };
	try {
		const eintraege = await readdir(ordner, { withFileTypes: true });
		const gelesen: (AblageDatei & { zeit: number })[] = [];
		for (const e of eintraege) {
			if (e.name.startsWith('.')) continue;
			const s = await stat(join(ordner, e.name)).catch(() => null);
			if (!s) continue;
			gelesen.push({
				name: e.name,
				ordner: e.isDirectory(),
				groesse: e.isDirectory() ? '' : groesseText(s.size),
				geaendert: zeitZuText(s.mtime.toISOString()),
				zeit: s.mtimeMs
			});
		}
		gelesen.sort((a, b) => b.zeit - a.zeit);
		return {
			dateien: gelesen.slice(0, 100).map(({ zeit, ...rest }) => rest),
			ordner,
			fehler: null
		};
	} catch (e) {
		const roh = e as NodeJS.ErrnoException;
		const meldung =
			roh?.code === 'ENOENT'
				? `Ordner nicht gefunden: ${ordner}`
				: roh?.code === 'ENOTDIR'
					? `Das ist ein Ordner, keine Datei: ${ordner}`
					: (e as Error).message;
		return { dateien: [], ordner, fehler: meldung };
	}
}

/* ---------------------------------------------------------------- Aufgaben */

export type BoardAufgabe = {
	id: string;
	titel: string;
	zustand: string;
	rolle: string;
	ergebnis: string;
	erstellt: string;
	eltern: string[];
};

export type AufgabenStand = { aufgaben: BoardAufgabe[]; fehler: string | null };

/**
 * Das Kanban-Board ueber die Kommandozeile des Harness.
 *
 * HERMES_BIN gewinnt, sonst das erste ausfuehrbare `hermes` im PATH, so wie es
 * eine Shell finden wuerde. Kein fest verdrahtetes Heimatverzeichnis.
 */
export function klingeFinden(): string | null {
	const ausUmgebung = (env.HERMES_BIN ?? '').trim();
	if (ausUmgebung) return ausUmgebung;
	for (const ordner of (process.env.PATH ?? '').split(delimiter)) {
		if (!ordner) continue;
		const kandidat = join(ordner, 'hermes');
		try {
			accessSync(kandidat, constants.X_OK);
			return kandidat;
		} catch {
			/* Nothing executable here; try the next PATH entry. */
		}
	}
	return null;
}

function zahlZuZeit(wert: unknown): string {
	const n = Number(wert);
	if (!n) return '';
	const d = new Date(n * 1000);
	return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function aufgabenLesen(): Promise<AufgabenStand> {
	const klinge = klingeFinden();
	if (!klinge) return { aufgaben: [], fehler: NICHT_GEFUNDEN };
	try {
		const { stdout } = await lauf(klinge, ['kanban', 'list', '--json'], {
			timeout: 20000,
			maxBuffer: 4 * 1024 * 1024
		});
		const roh = JSON.parse(stdout || '[]');
		const liste: Record<string, unknown>[] = Array.isArray(roh)
			? (roh as Record<string, unknown>[])
			: ((roh.tasks ?? roh.data ?? []) as Record<string, unknown>[]);
		const aufgaben = liste.map((t) => ({
			id: text(t.id),
			titel: text(t.title),
			zustand: text(t.status) || 'todo',
			rolle: text(t.assignee),
			ergebnis: text(t.summary ?? t.result),
			erstellt: zahlZuZeit(t.created_at),
			eltern: Array.isArray(t.parent_ids) ? (t.parent_ids as string[]).map(text) : []
		}));
		return { aufgaben, fehler: null };
	} catch (e) {
		// A missing binary must read as a clear instruction, not as a raw ENOENT.
		const roh = e as NodeJS.ErrnoException;
		return { aufgaben: [], fehler: roh?.code === 'ENOENT' ? NICHT_GEFUNDEN : (e as Error).message };
	}
}
