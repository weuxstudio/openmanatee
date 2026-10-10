import { beforeEach, describe, expect, it, vi } from 'vitest';

type Aufgezeichnet = { art: string; daten: Record<string, unknown> };

/**
 * Shared control block between the test and the mocked api module.
 * `vi.hoisted` lifts it above the `vi.mock` call, so the factory can use it.
 */
const steuerung = vi.hoisted(() => ({
	/** The recorded event sequence the mocked stream replays. */
	ereignisse: [] as { art: string; daten: Record<string, unknown> }[],
	/** One state snapshot, taken right after each replayed event. */
	momente: [] as unknown[],
	/** Filled by the test so the mock can read the live session state. */
	messen: null as null | (() => unknown)
}));

/**
 * Replace the transport. `zug` never touches the network; it walks the recorded
 * sequence and snapshots the session state after every single event. That is how
 * short-lived states such as an open approval stay observable.
 */
vi.mock('./api', () => ({
	standLaden: async () => ({ echt: true, basis: null }),
	sitzungAnlegen: async () => 'test-sitzung',
	verlauf: async () => [],
	zugStoppen: async () => {},
	freigabe: async () => {},
	stromLesen: async () => {},
	zug: async (
		_id: string,
		_eingabe: string,
		beiEreignis: (e: { art: string; daten: Record<string, unknown> }) => void
	) => {
		for (const e of steuerung.ereignisse) {
			beiEreignis(e);
			steuerung.momente.push(steuerung.messen ? steuerung.messen() : null);
		}
	}
}));

import { sitzung } from './sitzung.svelte';

/** The fourteen kinds the session understands, in the order of the contract. */
const ARTEN = [
	'run.started',
	'message.started',
	'assistant.delta',
	'assistant.commentary',
	'assistant.completed',
	'tool.started',
	'tool.progress',
	'tool.completed',
	'approval.requested',
	'approval.required',
	'run.completed',
	'run.failed',
	'run.cancelled',
	'done'
];

/**
 * One recorded sequence that carries every kind. The indices below are the
 * anchors for the per-kind assertions further down.
 */
const ABLAUF: Aufgezeichnet[] = [
	/* 0 */ { art: 'run.started', daten: {} },
	/* 1 */ { art: 'assistant.delta', daten: { text: 'Erster Teil' } },
	/* 2 */ { art: 'message.started', daten: {} },
	/* 3 */ { art: 'assistant.delta', daten: { text: 'Zweiter Teil' } },
	/* 4 */ { art: 'assistant.delta', daten: { text: ' und Schluss' } },
	/* 5 */ { art: 'assistant.commentary', daten: { text: 'Ich pruefe die Zahlen.' } },
	/* 6 */ {
		art: 'tool.started',
		daten: {
			tool_name: 'read_file',
			preview: 'kapitel-2.md',
			args: { path: 'documents/kapitel-2.md' }
		}
	},
	/* 7 */ { art: 'tool.progress', daten: { tool_name: 'read_file', delta: '120 Zeilen gelesen' } },
	/* 8 */ { art: 'tool.completed', daten: { tool_name: 'read_file', duration_ms: 400 } },
	/* 9 */ { art: 'assistant.completed', daten: { content: 'Der Bericht ist fertig.' } },
	/* 10 */ {
		art: 'approval.requested',
		daten: {
			tool: 'terminal',
			command: 'rm -rf build/',
			reason: 'Loescht das Build-Verzeichnis.',
			run_id: 'lauf-1'
		}
	},
	/* 11 */ {
		art: 'approval.required',
		daten: { tool: 'terminal', command: 'rm -rf build/', run_id: 'lauf-1' }
	},
	/* 12 */ {
		art: 'tool.started',
		daten: { tool_name: 'terminal', preview: 'rm -rf build/', args: { command: 'rm -rf build/' } }
	},
	/* 13 */ { art: 'tool.completed', daten: { tool_name: 'terminal', duration_ms: 2100 } },
	/* 14 */ { art: 'run.failed', daten: { error: 'Werkzeug nicht gefunden' } },
	/* 15 */ { art: 'run.cancelled', daten: {} },
	/* 16 */ { art: 'done', daten: {} },
	/* 17 */ { art: 'run.completed', daten: {} }
];

type Moment = {
	laeuft: boolean;
	freigabe: { werkzeug: string; befehl: string; warnung?: string; runId: string } | null;
	kommentar: string;
	hinweis: string | null;
	nachrichten: { art: 'nutzer' | 'agent'; text: string }[];
	schritte: {
		name: string;
		arg: string;
		ausgabe?: string;
		pfad?: string;
		zustand: 'ok' | 'laeuft' | 'fehler';
		dauer: string;
	}[];
	unbekannt: string[];
};

/** Snapshot the observable state, taken after one event. */
function moment(): Moment {
	return {
		laeuft: sitzung.laeuft,
		freigabe: sitzung.freigabe ? { ...sitzung.freigabe } : null,
		kommentar: sitzung.kommentar,
		hinweis: sitzung.hinweis,
		nachrichten: sitzung.nachrichten.map((n) => ({ ...n })),
		schritte: sitzung.schritte.map((s) => ({ ...s })),
		unbekannt: [...sitzung.unbekannt]
	};
}

/** The snapshot that was taken right after the event at `stelle`. */
function stand(stelle: number): Moment {
	return steuerung.momente[stelle] as Moment;
}

/** Only the agent messages, in order. */
function agentText(stelle: number): string[] {
	return stand(stelle)
		.nachrichten.filter((n) => n.art === 'agent')
		.map((n) => n.text);
}

/** Push the recorded sequence through the session and snapshot each step. */
async function abspielen(): Promise<void> {
	await sitzung.senden('Prüfe den Bericht.');
}

beforeEach(() => {
	sitzung.echt = true;
	sitzung.laeuft = false;
	sitzung.kennung = null;
	sitzung.schritte = [];
	sitzung.freigabe = null;
	sitzung.kommentar = '';
	sitzung.nachrichten = [];
	sitzung.hinweis = null;
	sitzung.unbekannt = [];
	steuerung.ereignisse = ABLAUF;
	steuerung.momente = [];
	steuerung.messen = moment;
});

describe('Sitzung: die Ereigniskette', () => {
	it('enthaelt alle vierzehn Arten genau einmal oder oefter', () => {
		const vorhanden = new Set(ABLAUF.map((e) => e.art));
		expect([...vorhanden].sort()).toEqual([...ARTEN].sort());
		expect(ABLAUF).toHaveLength(18);
	});

	it('run.started: der Lauf gilt als laufend', async () => {
		await abspielen();
		expect(stand(0).laeuft).toBe(true);
	});

	it('message.started: der naechste Text beginnt eine neue Nachricht', async () => {
		await abspielen();
		expect(agentText(1)).toEqual(['Erster Teil']);
		// After message.started the open flag is reset, so the next delta starts
		// a second message instead of being appended to the first one.
		expect(agentText(3)).toEqual(['Erster Teil', 'Zweiter Teil']);
	});

	it('assistant.delta: aufeinanderfolgende Stuecke werden zusammengesetzt', async () => {
		await abspielen();
		expect(agentText(4).at(-1)).toBe('Zweiter Teil und Schluss');
	});

	it('assistant.commentary: der Kommentar steht im Zustand', async () => {
		await abspielen();
		expect(stand(5).kommentar).toBe('Ich pruefe die Zahlen.');
	});

	it('tool.started: der Schritt ist laufend und kennt seinen Pfad', async () => {
		await abspielen();
		const letzter = stand(6).schritte.at(-1);
		expect(letzter?.name).toBe('read_file');
		expect(letzter?.zustand).toBe('laeuft');
		expect(letzter?.pfad).toBe('documents/kapitel-2.md');
	});

	it('tool.progress: der Fortschritt landet als Ausgabe am Schritt', async () => {
		await abspielen();
		expect(stand(7).schritte.at(-1)?.ausgabe).toContain('120 Zeilen gelesen');
	});

	it('tool.completed: der Schritt ist fertig und traegt seine Dauer', async () => {
		await abspielen();
		const letzter = stand(8).schritte.at(-1);
		expect(letzter?.zustand).toBe('ok');
		expect(letzter?.dauer).toBe('0,4 s');
	});

	it('assistant.completed: der vollstaendige Text ersetzt das Stueckwerk', async () => {
		await abspielen();
		expect(agentText(9).at(-1)).toBe('Der Bericht ist fertig.');
	});

	it('approval.requested: die Freigabe ist offen und nennt den Befehl', async () => {
		await abspielen();
		expect(stand(10).freigabe).not.toBeNull();
		expect(stand(10).freigabe?.werkzeug).toBe('terminal');
		expect(stand(10).freigabe?.befehl).toBe('rm -rf build/');
	});

	it('approval.required: auch die zweite Schreibweise oeffnet die Freigabe', async () => {
		await abspielen();
		expect(stand(11).freigabe?.werkzeug).toBe('terminal');
		expect(stand(11).freigabe?.warnung).toBeUndefined();
	});

	it('tool.started und tool.completed: der zweite Schritt wird ebenfalls fertig', async () => {
		await abspielen();
		expect(stand(12).schritte.at(-1)?.name).toBe('terminal');
		const letzter = stand(13).schritte.at(-1);
		expect(letzter?.zustand).toBe('ok');
		expect(letzter?.dauer).toBe('2,1 s');
	});

	it('run.failed: der Fehler steht im Zustand und nichts laeuft mehr', async () => {
		await abspielen();
		expect(stand(14).hinweis).toBe('Zug mit Fehler beendet.');
		expect(stand(14).laeuft).toBe(false);
		expect(stand(14).freigabe).toBeNull();
	});

	it('run.cancelled: der Abbruch steht im Zustand und nichts laeuft mehr', async () => {
		await abspielen();
		expect(stand(15).hinweis).toBe('Zug abgebrochen.');
		expect(stand(15).laeuft).toBe(false);
	});

	it('done: der Lauf ist beendet', async () => {
		await abspielen();
		expect(stand(16).laeuft).toBe(false);
		expect(stand(16).freigabe).toBeNull();
	});

	it('run.completed: der Lauf ist beendet und kein Schritt bleibt offen', async () => {
		await abspielen();
		expect(stand(17).laeuft).toBe(false);
		expect(stand(17).schritte.every((s) => s.zustand === 'ok')).toBe(true);
	});

	it('keine der vierzehn Arten faellt in den unbekannten Zweig', async () => {
		await abspielen();
		expect(stand(17).unbekannt).toEqual([]);
	});

	it('eine unbekannte Art wird gemerkt statt still verschluckt', async () => {
		steuerung.ereignisse = [{ art: 'tool.erfunden', daten: {} }];
		await abspielen();
		expect(sitzung.unbekannt).toContain('tool.erfunden');
	});
});
