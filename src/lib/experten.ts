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

export type ExpertenStand = {
	experten: Experte[];
	/** True when the route answered with built-in examples instead of real profiles. */
	beispiel: boolean;
	fehler?: string;
};

export async function expertenLaden(): Promise<ExpertenStand> {
	try {
		const a = await fetch('/api/experten');
		const d = (await a.json()) as Partial<ExpertenStand>;
		return {
			experten: Array.isArray(d.experten) ? d.experten : [],
			beispiel: d.beispiel === true,
			fehler: d.fehler
		};
	} catch (e) {
		return { experten: [], beispiel: false, fehler: (e as Error).message };
	}
}
