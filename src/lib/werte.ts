/**
 * Werte der App an einer Stelle: Rollen, Formen, Farben, Aktionskarten und Leiste.
 * Die Figur einer Rolle entsteht aus Form und Farbe, nicht aus einem Bild.
 */

export type Form = 'kugel' | 'wuerfel' | 'dreieck' | 'stern' | 'sechseck';

export type Rolle = {
	name: string;
	form: Form;
	basis: string;
	hell: string;
	dunkel: string;
	zustand: string;
	text: string;
	sitzung: string | null;
};

export const AGENTEN: Record<string, Rolle> = {
	// The key `manatee` is the protocol/role identifier shared with the model; the
	// visible label of the main role comes from PUBLIC_APP_NAME at runtime.
	manatee: {
		name: '',
		form: 'kugel',
		basis: '#F5C542',
		hell: '#FFE79A',
		dunkel: '#D9A21F',
		zustand: 'immer da',
		text: 'Dein persönlicher Agent. Plant, entwirft, recherchiert und liefert.',
		sitzung: 'heute'
	},
	Recherche: {
		name: 'Recherche',
		form: 'wuerfel',
		basis: '#8B5CF6',
		hell: '#C4A8FF',
		dunkel: '#6D3FD4',
		zustand: 'ruht',
		text: 'Findet und versteht, worauf es ankommt.',
		sitzung: null
	},
	Entwurf: {
		name: 'Entwurf',
		form: 'dreieck',
		basis: '#3B82F6',
		hell: '#9DC4FF',
		dunkel: '#1F5FD0',
		zustand: 'ruht',
		text: 'Macht aus Ideen Text, Bild und Prototyp.',
		sitzung: null
	},
	Ordnung: {
		name: 'Ordnung',
		form: 'sechseck',
		basis: '#34D399',
		hell: '#B7F2D8',
		dunkel: '#12A06C',
		zustand: 'plant',
		text: 'Hält Aufgaben, Kalender und Notizen zusammen.',
		sitzung: null
	},
	Ablauf: {
		name: 'Ablauf',
		form: 'stern',
		basis: '#F87171',
		hell: '#FFC0BE',
		dunkel: '#D33B3B',
		zustand: 'ruht',
		text: 'Automatisiert Wege über deine Werkzeuge.',
		sitzung: null
	},
	Sonstige: {
		name: 'Sonstige',
		form: 'wuerfel',
		basis: '#8E8E93',
		hell: '#D9D9DE',
		dunkel: '#5A5A5F',
		zustand: 'bereit',
		text: 'Neue Rolle ohne eigene Form.',
		sitzung: null
	}
};

export const HAUPT = AGENTEN.manatee;

/** Findet die Figur zu einem Rollennamen, egal wie er geschrieben ist. */
export function rollenSchluessel(rolle: string): string {
	const treffer = Object.keys(AGENTEN).find((k) => k.toLowerCase() === rolle.trim().toLowerCase());
	return treffer ?? 'Sonstige';
}

export const AKTIONEN: { icon: string; titel: string; text: string; rolle: string }[] = [
	{ icon: 'kalender', titel: 'Planen', text: 'Sortiere deinen Tag', rolle: 'Ordnung' },
	{ icon: 'dokument', titel: 'Entwerfen', text: 'Ideen werden zu Ergebnissen', rolle: 'Entwurf' },
	{ icon: 'lupe', titel: 'Recherchieren', text: 'Finde, was zählt', rolle: 'Recherche' },
	{ icon: 'blitz', titel: 'Automatisieren', text: 'Läuft ohne dich', rolle: 'Ablauf' }
];

export const LEISTE: { weg: string; icon: string; label: string }[] = [
	{ weg: '/', icon: 'haus', label: 'Start' },
	{ weg: '/agenten', icon: 'leute', label: 'Agenten' },
	{ weg: '/aufgaben', icon: 'haken', label: 'Aufgaben' },
	{ weg: '/ablage', icon: 'ordner', label: 'Ablage' }
];
