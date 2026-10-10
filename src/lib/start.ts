/**
 * Der Stand dieser Maschine fuer die Startseite.
 *
 * Gelesen wird serverseitig ueber /api/start, damit der Browser keinen Zugang
 * zu Dateien oder Kommandos des Rechners braucht.
 */

export type NaechsterLauf = { name: string; wann: string; zeitplan: string };

export type StartStand = {
	gruss: string;
	aufgaben: { gesamt: number; offen: number; fertig: number };
	routinen: { gesamt: number; aktiv: number; naechste: NaechsterLauf[] };
	ergebnisse: {
		anzahl: number;
		ordner: string;
		neuestes: { name: string; geaendert: string } | null;
	};
	/** True when the route answered with built-in examples instead of real data. */
	beispiel: boolean;
	fehler?: string;
};

export const START_LEER: StartStand = {
	gruss: 'Hallo',
	aufgaben: { gesamt: 0, offen: 0, fertig: 0 },
	routinen: { gesamt: 0, aktiv: 0, naechste: [] },
	ergebnisse: { anzahl: 0, ordner: '', neuestes: null },
	beispiel: false
};

export async function startLaden(): Promise<StartStand> {
	try {
		const a = await fetch('/api/start');
		const d = (await a.json()) as Partial<StartStand>;
		return {
			...START_LEER,
			...d,
			aufgaben: { ...START_LEER.aufgaben, ...d.aufgaben },
			routinen: { ...START_LEER.routinen, ...d.routinen },
			ergebnisse: { ...START_LEER.ergebnisse, ...d.ergebnisse }
		};
	} catch (e) {
		return { ...START_LEER, fehler: (e as Error).message };
	}
}

/**
 * Die zweite Zeile des Grusses: der eine wahre Satz, der dort etwas taugt.
 *
 * Kurz gehalten, damit der Gruss ein Gruss bleibt. Die Zahlen stehen direkt
 * darunter in den Kacheln.
 */
export function kurzSatz(s: StartStand): string {
	if (s.aufgaben.offen > 0) {
		const n = s.aufgaben.offen;
		return `${n} ${n === 1 ? 'Aufgabe' : 'Aufgaben'} offen.`;
	}
	if (s.routinen.aktiv > 0) {
		const n = s.routinen.aktiv;
		return `${n} ${n === 1 ? 'Routine läuft' : 'Routinen laufen'}.`;
	}
	if (s.routinen.gesamt > 0) return 'Nichts offen.';
	return 'Noch nichts eingerichtet.';
}
