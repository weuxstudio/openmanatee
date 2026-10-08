/**
 * Strichsymbole. Ein Satz, gleiche Strichstaerke, nur Linien, keine Flaeclen.
 * Farbe kommt ueber currentColor, damit die Symbole ueberall mitspielen.
 */
const PFADE: Record<string, string> = {
	plus: '<path d="M12 5v14M5 12h14"/>',
	chevron: '<path d="M9 5l7 7-7 7"/>',
	zurueck: '<path d="M15 5l-7 7 7 7"/>',
	mehr: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
	haus: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
	leute:
		'<circle cx="9" cy="9" r="3"/><path d="M3.5 19c.6-3 2.9-4.5 5.5-4.5S14 16 14.5 19"/><circle cx="17" cy="10" r="2.4"/><path d="M15 19c.4-2.2 1.6-3.4 3.4-3.4"/>',
	haken: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.2l2.6 2.6 4.6-5"/>',
	check: '<path d="M5 12.8l4.4 4.4L19 6.6"/>',
	ordner: '<path d="M4 8a2 2 0 0 1 2-2h3.2l1.6 2H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
	kalender: '<rect x="4" y="6" width="16" height="14" rx="3"/><path d="M4 10h16M9 4v4M15 4v4"/>',
	dokument: '<path d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M14 4v4h4"/>',
	lupe: '<circle cx="11" cy="11" r="5.5"/><path d="M15.2 15.2L20 20"/>',
	blitz: '<path d="M13 3L6 13h5l-1 8 8-11h-5z"/>',
	mikro: '<rect x="9.5" y="4" width="5" height="10" rx="2.5"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V20"/>',
	welle: '<path d="M4 12h2M8 8v8M12 5v14M16 9v6M20 12h0.5"/>',
	pfeil: '<path d="M5 12h13M13 6l6 6-6 6"/>',
	stopp: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
	senden: '<path d="M5 12h13M13 6l6 6-6 6"/>',
	schloss: '<rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2"/>',
	datei: '<path d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>',
	netz: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/><path d="M12 4c2.4 2.7 2.4 13.3 0 16"/><path d="M12 4c-2.4 2.7-2.4 13.3 0 16"/>',
	stift: '<path d="M5 19l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L9 18z"/><path d="M14.5 6.5l3 3"/>',
	terminal: '<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 10l2 2-2 2"/><path d="M13 14h4"/>',
	auge:
		'<path d="M2.5 12S6 6.6 12 6.6 21.5 12 21.5 12 18 17.4 12 17.4 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
	kopf:
		'<path d="M12 3.2a5.8 5.8 0 0 0-3.3 10.6V16h6.6v-2.2A5.8 5.8 0 0 0 12 3.2z"/><path d="M10 19h4"/><path d="M12 16v3"/>',
	tafel: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/><path d="M3.5 10h17"/>',
	frage: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.7.3-1 .8-1 1.5v.5"/><circle cx="11.9" cy="16.6" r="0.9"/>',
	stern: '<path d="M12 4l2 5.2 5.2 2-5.2 2L12 18.4l-2-5.2-5.2-2 5.2-2z"/>'
};

export function pfad(name: string): string {
	return PFADE[name] ?? PFADE.plus;
}

export const SYMBOLNAMEN = Object.keys(PFADE);
