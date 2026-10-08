/**
 * Built-in examples for a copy that runs without an access door.
 *
 * Case 3 of the door means APP_TOKEN is empty and no harness key is set. No
 * cookie can ever be issued then, so /api/board and /api/experten would stay
 * closed forever and a first visit would only show "not logged in". For an
 * open project the first walk through is the business card, so both routes
 * answer these examples instead - without reading one byte from the host.
 *
 * Once the door is active (case 1 or case 2) the routes are guarded and the
 * real data runs behind the cookie. The examples below are never mixed into
 * that path.
 */

export type MusterAufgabe = {
	id: string;
	titel: string;
	zustand: string;
	rolle: string;
	ergebnis: string;
	erstellt: string;
	eltern: string[];
};

export type MusterExperte = {
	name: string;
	beschreibung: string;
};

/**
 * A board with one task per interesting state, so the interface shows every
 * badge at once. The shape matches what `hermes kanban list --json` produces.
 */
export const MUSTER_AUFGABEN: MusterAufgabe[] = [
	{
		id: 'muster-1',
		titel: 'Beispiel: Quartalsbericht gliedern',
		zustand: 'running',
		rolle: 'Ordnung',
		ergebnis: 'Gliederung steht, Zahlen fehlen noch.',
		erstellt: '01.01. 09:15',
		eltern: []
	},
	{
		id: 'muster-2',
		titel: 'Beispiel: Wettbewerb recherchieren',
		zustand: 'ready',
		rolle: 'Recherche',
		ergebnis: '',
		erstellt: '01.01. 09:40',
		eltern: []
	},
	{
		id: 'muster-3',
		titel: 'Beispiel: Startseite texten',
		zustand: 'blocked',
		rolle: 'Entwurf',
		ergebnis: 'Wartet auf die Freigabe der Tonlage.',
		erstellt: '01.01. 10:05',
		eltern: ['muster-1']
	},
	{
		id: 'muster-4',
		titel: 'Beispiel: Nachtlauf einrichten',
		zustand: 'todo',
		rolle: 'Ablauf',
		ergebnis: '',
		erstellt: '01.01. 10:20',
		eltern: []
	},
	{
		id: 'muster-5',
		titel: 'Beispiel: Kurzfassung schreiben',
		zustand: 'done',
		rolle: 'manatee',
		ergebnis: 'Kurzfassung liegt in der Ablage.',
		erstellt: '31.12. 17:30',
		eltern: ['muster-1']
	}
];

/**
 * One example profile per built-in role, so the agents page shows real figures
 * instead of an empty grid. The shape matches the profile list of the app.
 */
export const MUSTER_EXPERTEN: MusterExperte[] = [
	{
		name: 'Recherche',
		beschreibung: 'Beispielprofil: findet Quellen, prueft sie und fasst das Ergebnis zusammen.'
	},
	{
		name: 'Entwurf',
		beschreibung: 'Beispielprofil: macht aus einer Idee Text, Bild und einen ersten Prototyp.'
	},
	{
		name: 'Ordnung',
		beschreibung: 'Beispielprofil: haelt Aufgaben, Kalender und Notizen zusammen.'
	},
	{
		name: 'Ablauf',
		beschreibung: 'Beispielprofil: verbindet Werkzeuge zu einem Lauf, der ohne dich startet.'
	}
];
