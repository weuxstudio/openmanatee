/**
 * Die Routinen, wie die Aufgabenseite sie zeigt.
 *
 * Gelesen wird serverseitig aus der Auftragsliste des Harness, damit der
 * Browser keinen Zugang zu Dateien des Rechners braucht.
 */
export type Routine = {
	name: string;
	/** Zeitplan in Worten, sonst der rohe Ausdruck. */
	zeitplan: string;
	zustand: 'laeuft' | 'ruht';
	naechster: string;
	letzter: string;
	art: string;
};

export type Routinen = {
	routinen: Routine[];
	/** True when the route answered with built-in examples instead of real data. */
	beispiel: boolean;
	fehler?: string;
};

export async function routinenLaden(): Promise<Routinen> {
	try {
		const a = await fetch('/api/routinen');
		const d = (await a.json()) as Partial<Routinen>;
		return {
			routinen: Array.isArray(d.routinen) ? d.routinen : [],
			beispiel: d.beispiel === true,
			fehler: d.fehler
		};
	} catch (e) {
		return { routinen: [], beispiel: false, fehler: (e as Error).message };
	}
}

/** Kurzfassung fuer die Kopfzeile: "14 Routinen, 10 aktiv". */
export function routinenZahl(routinen: Routine[]): string {
	if (!routinen.length) return '';
	const aktiv = routinen.filter((r) => r.zustand === 'laeuft').length;
	const pausiert = routinen.length - aktiv;
	if (!pausiert) return `${routinen.length} Routinen, alle aktiv`;
	return `${routinen.length} Routinen, ${aktiv} aktiv, ${pausiert} pausiert`;
}
