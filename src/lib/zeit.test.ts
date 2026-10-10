import { describe, expect, it } from 'vitest';
import { grussZeit, kurzZeit } from './zeit';

describe('Zeit: Gruss nach Uhrzeit', () => {
	it('trifft die Tageszeiten an ihren Grenzen', () => {
		expect(grussZeit(4)).toBe('Gute Nacht');
		expect(grussZeit(5)).toBe('Guten Morgen');
		expect(grussZeit(10)).toBe('Guten Morgen');
		expect(grussZeit(11)).toBe('Guten Tag');
		expect(grussZeit(17)).toBe('Guten Tag');
		expect(grussZeit(18)).toBe('Guten Abend');
		expect(grussZeit(22)).toBe('Guten Abend');
		expect(grussZeit(23)).toBe('Gute Nacht');
	});

	it('bleibt bei unsinnigen Werten freundlich', () => {
		expect(grussZeit(Number.NaN)).toBe('Hallo');
		expect(grussZeit(25)).toBe('Gute Nacht');
		expect(grussZeit(-1)).toBe('Gute Nacht');
	});
});

describe('Zeit: kurze Angabe', () => {
	const jetzt = new Date('2026-10-10T21:30:00');

	it('zeigt heute nur die Uhrzeit', () => {
		expect(kurzZeit('2026-10-10T21:43:00', jetzt)).toBe('21:43');
	});

	it('nennt den naechsten Tag "morgen"', () => {
		expect(kurzZeit('2026-10-11T07:00:00', jetzt)).toBe('morgen 07:00');
	});

	it('nennt spaetere Tage mit Datum', () => {
		expect(kurzZeit('2026-10-12T09:00:00', jetzt)).toBe('12.10. 09:00');
	});

	it('gibt bei Unsinn nichts aus', () => {
		expect(kurzZeit('keine Zeit', jetzt)).toBe('');
		expect(kurzZeit('', jetzt)).toBe('');
	});
});
