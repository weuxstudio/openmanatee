import { describe, expect, it } from 'vitest';
import { alsListe, alsRoutine, zeitplanText, zeitZuText } from './routinen';

/**
 * Die Faelle sind die Zeitplaene, die auf dieser Maschine wirklich in der
 * Auftragsliste stehen, nicht ausgedachte Beispiele.
 */
const ECHTE = [
	['0 8 * * *', 'taeglich 08:00'],
	['0 10 * * 5', 'freitags 10:00'],
	['0 10 * * 6', 'samstags 10:00'],
	['0 7 * * *', 'taeglich 07:00'],
	['* * * * *', 'jede Minute'],
	['0 9 * * 1', 'montags 09:00'],
	['0 10 */2 * *', 'alle 2 Tage 10:00'],
	['0 20 * * *', 'taeglich 20:00'],
	['0 9 * * *', 'taeglich 09:00'],
	['every 5m', 'alle 5 Minuten'],
	['every 1m', 'jede Minute'],
	['30 6 * * 3', 'mittwochs 06:30']
];

describe('Routinen: Zeitplan in Worten', () => {
	for (const [ausdruck, erwartet] of ECHTE) {
		it(`${ausdruck} wird zu ${erwartet}`, () => {
			expect(zeitplanText(ausdruck)).toBe(erwartet);
		});
	}

	it('laesst stehen, was nicht erkannt wird', () => {
		expect(zeitplanText('0 10 1 * *')).toBe('0 10 1 * *');
		expect(zeitplanText('')).toBe('');
		expect(zeitplanText('jeden Vollmond')).toBe('jeden Vollmond');
	});
});

describe('Routinen: Zeiten', () => {
	it('formatiert einen Zeitstempel des Harness', () => {
		expect(zeitZuText('2026-10-16T10:00:00+02:00')).toBe('16.10. 10:00');
		expect(zeitZuText('2026-10-09T10:01:09.601801+02:00')).toBe('09.10. 10:01');
	});

	it('gibt bei Unsinn nichts aus', () => {
		expect(zeitZuText(null)).toBe('');
		expect(zeitZuText('')).toBe('');
		expect(zeitZuText('gestern')).toBe('');
	});
});

describe('Routinen: aus der Auftragsliste', () => {
	const job = {
		name: 'AI Citation Check',
		schedule_display: '0 10 * * 5',
		enabled: true,
		state: 'scheduled',
		next_run_at: '2026-10-16T10:00:00+02:00',
		last_run_at: '2026-10-09T10:01:09.601801+02:00',
		last_status: 'ok',
		no_agent: false
	};

	it('liest Name, Zeitplan, naechsten Lauf und Ergebnis', () => {
		expect(alsRoutine(job)).toEqual({
			name: 'AI Citation Check',
			zeitplan: 'freitags 10:00',
			zustand: 'laeuft',
			naechster: '16.10. 10:00',
			naechsterIso: '2026-10-16T10:00:00+02:00',
			letzter: '09.10. 10:01 ok',
			art: 'Agent'
		});
	});

	it('verspricht bei pausierten Routinen keinen naechsten Lauf', () => {
		const r = alsRoutine({ ...job, enabled: false, state: 'paused' });
		expect(r.zustand).toBe('ruht');
		expect(r.naechster).toBe('');
	});

	it('nennt eine fehlgeschlagene Ausfuehrung Fehler, keine Zahl', () => {
		const r = alsRoutine({ ...job, last_status: 'error' });
		expect(r.letzter).toBe('09.10. 10:01 Fehler');
	});

	it('haelt eine noch nie gelaufene Routine aus', () => {
		const r = alsRoutine({ ...job, last_run_at: null, last_status: null });
		expect(r.letzter).toBe('');
	});

	it('erkennt Skriptroutinen', () => {
		expect(alsRoutine({ ...job, no_agent: true }).art).toBe('Skript');
	});

	it('nimmt beide Formen der Datei an', () => {
		expect(alsListe([job])).toHaveLength(1);
		expect(alsListe({ updated_at: 'x', jobs: [job, job] })).toHaveLength(2);
		expect(alsListe({})).toEqual([]);
		expect(alsListe(null)).toEqual([]);
	});
});
