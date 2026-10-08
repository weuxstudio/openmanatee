/**
 * Experten und ihre Figuren.
 *
 * Die Figur kommt aus der Rolle: gleiche Rolle, gleiche Form und Farbe. Rollen, die es in
 * den Werten noch nicht gibt, bekommen eine neutrale Figur statt einer erfundenen Farbe.
 */
import { AGENTEN, type Rolle } from '$lib/werte';

export type Experte = {
	name: string;
	beschreibung: string;
};

export type ExperteMitFigur = Experte & {
	figur: Rolle;
	zustand: string;
};

const NEUTRAL: Rolle = {
	name: '',
	form: 'wuerfel',
	basis: '#9a9aa0',
	hell: '#d8d8dd',
	dunkel: '#6e6e73',
	zustand: 'bereit',
	text: '',
	sitzung: null
};

export function figurFuer(rolle: string): Rolle {
	const treffer = Object.keys(AGENTEN).find((k) => k.toLowerCase() === rolle.toLowerCase());
	if (treffer) return AGENTEN[treffer];
	return { ...NEUTRAL, name: rolle };
}

export async function expertenLaden(): Promise<Experte[]> {
	try {
		const a = await fetch('/api/experten');
		const d = (await a.json()) as { experten?: Experte[] };
		return d.experten ?? [];
	} catch {
		return [];
	}
}
