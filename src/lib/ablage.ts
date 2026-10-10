/**
 * Die Ablage, wie die Seite sie zeigt.
 *
 * Der Ordner wird serverseitig aus ABLAGE_ORDNER gelesen. Ist dort nichts
 * eingetragen, kommt ein Hinweis zurueck statt einer erfundenen Liste.
 */
export type AblageDatei = {
	name: string;
	ordner: boolean;
	groesse: string;
	geaendert: string;
};

export type Ablage = {
	dateien: AblageDatei[];
	/** Der gelesene Ordner, leer wenn keiner gesetzt ist. */
	ordner: string;
	/** True when the route answered with built-in examples instead of real data. */
	beispiel: boolean;
	fehler?: string;
};

export async function ablageLaden(): Promise<Ablage> {
	try {
		const a = await fetch('/api/ablage');
		const d = (await a.json()) as Partial<Ablage>;
		return {
			dateien: Array.isArray(d.dateien) ? d.dateien : [],
			ordner: typeof d.ordner === 'string' ? d.ordner : '',
			beispiel: d.beispiel === true,
			fehler: d.fehler
		};
	} catch (e) {
		return { dateien: [], ordner: '', beispiel: false, fehler: (e as Error).message };
	}
}
