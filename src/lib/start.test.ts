import { describe, expect, it } from 'vitest';
import { START_LEER, kurzSatz, type StartStand } from './start';

function stand(teil: Partial<StartStand>): StartStand {
	return { ...START_LEER, ...teil };
}

describe('Startseite: zweite Grusszeile', () => {
	it('nennt offene Aufgaben zuerst', () => {
		expect(
			kurzSatz(stand({ aufgaben: { gesamt: 6, offen: 2, fertig: 4 }, routinen: { gesamt: 14, aktiv: 10, naechste: [] } }))
		).toBe('2 Aufgaben offen.');
	});

	it('nennt eine einzelne Aufgabe im Singular', () => {
		expect(kurzSatz(stand({ aufgaben: { gesamt: 1, offen: 1, fertig: 0 } }))).toBe('1 Aufgabe offen.');
	});

	it('faellt auf die laufenden Routinen zurueck', () => {
		expect(kurzSatz(stand({ routinen: { gesamt: 14, aktiv: 10, naechste: [] } }))).toBe('10 Routinen laufen.');
		expect(kurzSatz(stand({ routinen: { gesamt: 1, aktiv: 1, naechste: [] } }))).toBe('1 Routine läuft.');
	});

	it('bleibt ehrlich, wenn nichts da ist', () => {
		expect(kurzSatz(stand({ routinen: { gesamt: 3, aktiv: 0, naechste: [] } }))).toBe('Nichts offen.');
		expect(kurzSatz(START_LEER)).toBe('Noch nichts eingerichtet.');
	});
});
