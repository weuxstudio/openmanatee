/**
 * Der Stand dieser Maschine fuer die Startseite.
 *
 * Die Startseite soll keine Werbetexte tragen, sondern was wirklich da ist:
 * Aufgaben, Routinen, Ergebnisse. Gezaehlt wird mit denselben Lesern wie auf den
 * Seiten, zu denen die Kacheln fuehren, damit die Zahlen dort nicht anders sind.
 */
import { json } from '@sveltejs/kit';
import { tuerAktiv } from '$lib/server/tuer';
import { ablageLesen, aufgabenLesen, routinenLesen } from '$lib/server/lesen';
import { MUSTER_ABLAGE, MUSTER_AUFGABEN, MUSTER_ROUTINEN } from '$lib/server/muster';
import { grussZeit, kurzZeit } from '$lib/zeit';

/** Was die Startseite von einer Routine braucht; Beispiele haben kein ISO-Feld. */
type ZeigbareRoutine = {
	name: string;
	zeitplan: string;
	naechster: string;
	naechsterIso?: string;
};

function aufgabenZahlen(aufgaben: { zustand: string }[]) {
	const fertig = aufgaben.filter((a) => a.zustand === 'done' || a.zustand === 'archived').length;
	return { gesamt: aufgaben.length, offen: aufgaben.length - fertig, fertig };
}

function routinenZahlen(routinen: { zustand: string }[]) {
	return {
		gesamt: routinen.length,
		aktiv: routinen.filter((r) => r.zustand === 'laeuft').length
	};
}

/** Die naechsten Laeufe: nach Zeitpunkt sortiert, sonst nach der Angabe. */
function naechsteLaeufe(routinen: ZeigbareRoutine[], anzahl = 3) {
	return routinen
		.filter((r) => r.naechsterIso || r.naechster)
		.slice()
		.sort((a, b) => (a.naechsterIso ?? '').localeCompare(b.naechsterIso ?? ''))
		.slice(0, anzahl)
		.map((r) => ({
			name: r.name,
			wann: r.naechsterIso ? kurzZeit(r.naechsterIso) : r.naechster,
			zeitplan: r.zeitplan
		}));
}

function ergebnisZahlen(dateien: { name: string; geaendert: string }[], ordner: string) {
	return {
		anzahl: dateien.length,
		ordner,
		neuestes: dateien.length ? { name: dateien[0].name, geaendert: dateien[0].geaendert } : null
	};
}

export async function GET() {
	const gruss = grussZeit(new Date().getHours());

	// Ohne Tuer kann kein Cookie ausgestellt werden. Dann antworten die Beispiele,
	// damit die Seite beim ersten Blick etwas zeigt; `beispiel` sagt, woher es kommt.
	if (!tuerAktiv()) {
		return json({
			gruss,
			aufgaben: aufgabenZahlen(MUSTER_AUFGABEN),
			routinen: { ...routinenZahlen(MUSTER_ROUTINEN), naechste: naechsteLaeufe(MUSTER_ROUTINEN) },
			ergebnisse: ergebnisZahlen(MUSTER_ABLAGE, ''),
			beispiel: true
		});
	}

	const [a, r, b] = await Promise.all([aufgabenLesen(), routinenLesen(), ablageLesen()]);
	return json({
		gruss,
		aufgaben: aufgabenZahlen(a.aufgaben),
		routinen: { ...routinenZahlen(r.routinen), naechste: naechsteLaeufe(r.routinen) },
		ergebnisse: ergebnisZahlen(b.dateien, b.ordner),
		beispiel: false,
		fehler: a.fehler ?? r.fehler ?? b.fehler ?? undefined
	});
}
