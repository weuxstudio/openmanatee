/**
 * Das Board, wie die App es zeigt.
 *
 * Gelesen wird serverseitig ueber die Kommandozeile des Harness (`hermes kanban list --json`),
 * damit die Oberflaeche keinen Schluessel braucht und nur sieht, was sie zeigen soll.
 */
export type BoardAufgabe = {
	id: string;
	titel: string;
	zustand: string;
	rolle: string;
	ergebnis: string;
	erstellt: string;
	eltern: string[];
};

export type Board = {
	aufgaben: BoardAufgabe[];
	fehler?: string;
};

export async function boardLaden(): Promise<Board> {
	try {
		const a = await fetch('/api/board');
		return (await a.json()) as Board;
	} catch (e) {
		return { aufgaben: [], fehler: (e as Error).message };
	}
}

/** Klartext fuer die Zustaende des Boards. */
export const ZUSTAND_TEXT: Record<string, string> = {
	triage: 'zu klaeren',
	todo: 'wartet auf Vorlauf',
	ready: 'bereit',
	running: 'laeuft',
	blocked: 'haengt',
	review: 'zur Pruefung',
	done: 'fertig',
	archived: 'abgelegt'
};
