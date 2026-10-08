/**
 * Die Antwort des Agenten in Bloecke zerlegen.
 *
 * Eine Textwand ist schlechte UX. Lange Listen, Tabellen und Auszuege bekommen deshalb eine eigene
 * Form, in der man sie lesen kann. Das ist reine Formerkennung auf dem Text, das Modell muss nichts
 * dafuer tun.
 */

import { bausteinAusText, type Baustein } from './bausteine';

export type ListenEintrag = { titel: string; rest: string; unter: string[] };

export type Block =
	| { art: 'absatz'; text: string }
	| { art: 'titel'; text: string }
	| { art: 'liste'; eintraege: ListenEintrag[]; nummeriert: boolean }
	| { art: 'tabelle'; kopf: string[]; zeilen: string[][] }
	| { art: 'kasten'; text: string }
	| { art: 'baustein'; wert: Baustein };

/** Absatz ab dieser Laenge wird zusammengeklappt angeboten. */
export const LANG = 380;

const ZEICHEN: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;'
};

function entschaerfen(t: string): string {
	return t.replace(/[&<>"]/g, (z) => ZEICHEN[z] ?? z);
}

/**
 * Wenige Auszeichnungen von Hand, in dieser Reihenfolge: erst entschaerfen, dann setzen.
 * Alles andere bleibt Text. Verweise nur mit http(s), damit nichts Fremdes geladen wird.
 */
export function inline(t: string): string {
	let s = entschaerfen(t);
	s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
	s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	s = s.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
		'<a href="$2" target="_blank" rel="noreferrer">$1</a>'
	);
	s = s.replace(
		/(^|[\s(])(https?:\/\/[^\s<)]+)/g,
		'$1<a href="$2" target="_blank" rel="noreferrer">$2</a>'
	);
	return s;
}

/** Fett gesetzter Anfang, Doppelpunkt, Gedankenstrich oder Komma trennen Titel und Beiwerk. */
function zerlege(t: string): { titel: string; rest: string } {
	const fett = /^\s*\*\*(.+?)\*\*\s*[.:—–,-]?\s*(.*)$/.exec(t);
	if (fett) return { titel: fett[1].trim(), rest: fett[2].trim() };
	const doppel = /^\s*([^:—–]{3,70})[:—–]\s+(.+)$/.exec(t);
	if (doppel) return { titel: doppel[1].trim(), rest: doppel[2].trim() };
	const komma = /^\s*([^,]{3,60}),\s*(\S.*)$/.exec(t);
	if (komma) return { titel: komma[1].trim(), rest: komma[2].trim() };
	return { titel: '', rest: t.trim() };
}

/**
 * Stichpunktartige Zeile ohne Aufzaehlungszeichen.
 *
 * Modelle antworten oft mit kurzen Zeilen untereinander statt mit Zeichen davor ("datei.ts, 607
 * Zeilen"). Das ist trotzdem eine Liste und soll auch so aussehen. Zwei solche Zeilen hintereinander
 * genuegen, eine einzelne bleibt Absatz.
 */
function stichpunkt(z: string): boolean {
	const t = z.trim();
	if (!t || t.length > 140) return false;
	if (/[.!?]$/.test(t)) return false;
	if (/^(#|```|\|)/.test(t)) return false;
	return true;
}

const PUNKT = /^\s*(?:(\d{1,2})[.)]|[-*•])\s+(.*)$/;
const ZELLE = /\|/;

export function bloecke(text: string): Block[] {
	const zeilen = (text ?? '').replace(/\r\n?/g, '\n').split('\n');
	const raus: Block[] = [];
	let i = 0;

	while (i < zeilen.length) {
		const zeile = zeilen[i];

		if (!zeile.trim()) {
			i++;
			continue;
		}

		// Kasten: Codeblock unveraendert lassen. Der Katalogbaustein wird zur Ansicht.
		if (zeile.trim().startsWith('```')) {
			const sprache = zeile.trim().slice(3).trim().toLowerCase();
			const inhalt: string[] = [];
			i++;
			while (i < zeilen.length && !zeilen[i].trim().startsWith('```')) {
				inhalt.push(zeilen[i]);
				i++;
			}
			i++;
			const roh = inhalt.join('\n');
			if (['manatee', 'baustein', 'json', ''].includes(sprache)) {
				const wert = bausteinAusText(roh);
				if (wert) {
					raus.push({ art: 'baustein', wert });
					continue;
				}
			}
			raus.push({ art: 'kasten', text: roh });
			continue;
		}

		// Baustein ohne Zaun, wie es Modelle manchmal schreiben.
		if (/^\s*\{\s*"art"\s*:/.test(zeile)) {
			const wert = bausteinAusText(zeile.trim());
			if (wert) {
				raus.push({ art: 'baustein', wert });
				i++;
				continue;
			}
		}

		// Ueberschrift.
		const kopf = /^(#{1,6})\s+(.*)$/.exec(zeile);
		if (kopf) {
			raus.push({ art: 'titel', text: kopf[2].trim() });
			i++;
			continue;
		}

		// Tabelle: Kopfzeile mit Trennzeile darunter.
		if (ZELLE.test(zeile) && i + 1 < zeilen.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(zeilen[i + 1])) {
			const spalte = (z: string) =>
				z
					.replace(/^\s*\|/, '')
					.replace(/\|\s*$/, '')
					.split('|')
					.map((s) => s.trim());
			const kopfZellen = spalte(zeile);
			const daten: string[][] = [];
			i += 2;
			while (i < zeilen.length && ZELLE.test(zeilen[i]) && zeilen[i].trim()) {
				daten.push(spalte(zeilen[i]));
				i++;
			}
			raus.push({ art: 'tabelle', kopf: kopfZellen, zeilen: daten });
			continue;
		}

		// Liste: aufeinanderfolgende Punkte, eingerueckte Zeilen gehoeren zum Punkt darueber.
		if (PUNKT.test(zeile)) {
			const eintraege: ListenEintrag[] = [];
			let nummeriert = false;
			while (i < zeilen.length && zeilen[i].trim()) {
				const treffer = PUNKT.exec(zeilen[i]);
				if (treffer) {
					if (treffer[1]) nummeriert = true;
					const { titel, rest } = zerlege(treffer[2]);
					eintraege.push({ titel, rest, unter: [] });
					i++;
					continue;
				}
				// Fortsetzung: eingerueckt und kein neuer Punkt.
				if (eintraege.length && /^\s{2,}\S/.test(zeilen[i])) {
					eintraege[eintraege.length - 1].unter.push(zeilen[i].trim());
					i++;
					continue;
				}
				break;
			}
			raus.push({ art: 'liste', eintraege, nummeriert });
			continue;
		}

		// Stichpunkte ohne Aufzaehlungszeichen, mindestens zwei Zeilen untereinander.
		if (stichpunkt(zeile) && i + 1 < zeilen.length && stichpunkt(zeilen[i + 1])) {
			const eintraege: ListenEintrag[] = [];
			while (i < zeilen.length && zeilen[i].trim() && stichpunkt(zeilen[i])) {
				const { titel, rest } = zerlege(zeilen[i].trim());
				eintraege.push({ titel, rest, unter: [] });
				i++;
			}
			raus.push({ art: 'liste', eintraege, nummeriert: false });
			continue;
		}

		// Absatz bis zur Leerzeile.
		const absatz: string[] = [];
		while (i < zeilen.length && zeilen[i].trim() && !PUNKT.test(zeilen[i]) && !zeilen[i].trim().startsWith('```')) {
			absatz.push(zeilen[i].trim());
			i++;
		}
		if (absatz.length) raus.push({ art: 'absatz', text: absatz.join(' ') });
	}

	return raus;
}
