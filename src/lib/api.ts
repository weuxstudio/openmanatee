/**
 * Zugang zum Hermes-Server aus der Oberflaeche.
 *
 * Der Browser spricht nie direkt mit dem Harness und kennt auch keinen
 * Schluessel. Alle Aufrufe gehen an die App selbst, die weiterreicht.
 * Ist kein Schluessel gesetzt, meldet /api/status das, und die Oberflaeche
 * laeuft mit Musterdaten weiter.
 *
 * Vertrag laut Doku des Harness:
 *   POST /api/sessions                     leere Sitzung anlegen
 *   POST /api/sessions/{id}/chat/stream    ein Zug, Ereignisstrom
 *   GET  /api/sessions/{id}/messages       Verlauf
 *   POST /v1/runs/{id}/approval            Freigabe beantworten
 * Ereignisse im Strom: assistant.delta, assistant.commentary, tool.started,
 * tool.completed, run.completed, run.failed, run.cancelled.
 */

export type Sitzung = {
	id: string;
	titel: string;
	rolle?: string;
	aktualisiert?: string;
};

export type Nachricht = {
	rolle: 'nutzer' | 'agent';
	text: string;
	zeit?: string;
};

export type Ereignis = {
	art: string;
	daten: Record<string, unknown>;
};

/** Ein Eintrag des Verlaufs, wie der Server ihn liefert. */
export type VerlaufEintrag = {
	role?: string;
	content?: string;
	tool_name?: string;
	tool_calls?: { function?: { name?: string; arguments?: string } }[] | null;
	timestamp?: number;
};

export type Stand = {
	echt: boolean;
	basis: string | null;
	/** Version of the app itself, from package.json. */
	appVersion?: string;
	/** Whether the configured harness answered a short probe. */
	harnessAntwortet?: boolean;
	harnessFehler?: string | null;
	/** Whether a token gate is configured at all. */
	anmeldung?: boolean;
	/** Whether the caller already holds a valid login cookie. */
	angemeldet?: boolean;
};

let stand: Stand = { echt: false, basis: null };

export function istEcht(): boolean {
	return stand.echt;
}

/** Einmal beim Start fragen, ob ein Schluessel gesetzt ist. */
export async function standLaden(): Promise<Stand> {
	try {
		const a = await fetch('/api/status');
		stand = (await a.json()) as Stand;
	} catch {
		stand = { echt: false, basis: null };
	}
	return stand;
}

/**
 * Leere Sitzung anlegen und ihre Kennung zurueckgeben.
 * Ohne Titel, weil der Server doppelte Titel ablehnt und selbst einen Namen vergibt,
 * sobald die erste Nachricht da ist.
 */
export async function sitzungAnlegen(titel?: string): Promise<string> {
	const d = await hole('/api/sessions', {
		method: 'POST',
		body: JSON.stringify(titel ? { title: titel } : {})
	});
	// Der Server legt die Sitzung verschachtelt ab: {"object": "hermes.session", "session": {...}}
	const s = (d.session ?? d) as Record<string, unknown>;
	return String(s.id ?? d.id ?? '');
}

export async function sitzungen(): Promise<Sitzung[]> {
	const d = await hole('/api/sessions');
	return (d.data ?? d.sessions ?? []) as Sitzung[];
}

export async function verlauf(id: string): Promise<VerlaufEintrag[]> {
	const d = await hole(`/api/sessions/${encodeURIComponent(id)}/messages`);
	return (d.data ?? d.messages ?? []) as VerlaufEintrag[];
}

/** Ein Zug: Text senden, Ereignisse aus dem Strom weiterreichen.
 *
 * `auftrag` wird als Zusatzauftrag mitgeschickt und landet nicht im Verlauf. Darueber erfaehrt das
 * Modell vom Bausteinkatalog.
 */
export async function zug(
	id: string,
	eingabe: string,
	beiEreignis: (e: Ereignis) => void,
	abbruch?: AbortSignal,
	auftrag?: string
): Promise<void> {
	const koerper: Record<string, unknown> = { input: eingabe };
	if (auftrag) koerper.instructions = auftrag;
	const a = await roh(`/api/sessions/${encodeURIComponent(id)}/chat/stream`, {
		method: 'POST',
		body: JSON.stringify(koerper),
		headers: { Accept: 'text/event-stream' },
		signal: abbruch
	});
	await stromLesen(a, beiEreignis);
}

/** Laufenden Zug abbrechen. */
export async function zugStoppen(id: string): Promise<void> {
	await hole(`/api/sessions/${encodeURIComponent(id)}/chat/stop`, { method: 'POST' });
}

/** Freigabe beantworten. */
export async function freigabe(
	laufId: string,
	entscheidung: 'allow' | 'allow_session' | 'deny'
): Promise<void> {
	await hole(`/v1/runs/${encodeURIComponent(laufId)}/approval`, {
		method: 'POST',
		body: JSON.stringify({ decision: entscheidung })
	});
}

/** Routinen lesen. */
export async function routinen(): Promise<unknown[]> {
	const d = await hole('/api/jobs');
	return (d.jobs ?? d ?? []) as unknown[];
}

async function roh(weg: string, optionen: RequestInit = {}): Promise<Response> {
	const a = await fetch(`/api/hermes${weg}`, optionen);
	if (!a.ok) throw new Error(`${a.status} bei ${weg}`);
	return a;
}

async function hole(weg: string, optionen: RequestInit = {}): Promise<Record<string, unknown>> {
	const a = await roh(weg, optionen);
	return (await a.json()) as Record<string, unknown>;
}

/**
 * Ereignisstrom lesen. Zeilen mit `event:` setzen den Namen, Zeilen mit `data:`
 * tragen die Nutzlast, Zeilen mit `:` sind Lebenszeichen und werden ueberlesen.
 */
export async function stromLesen(
	antwort: Response,
	beiEreignis: (e: Ereignis) => void
): Promise<void> {
	const leser = antwort.body?.getReader();
	if (!leser) return;
	const entschluessler = new TextDecoder();
	let puffer = '';
	let name = '';
	for (;;) {
		const { value, done } = await leser.read();
		if (done) break;
		puffer += entschluessler.decode(value, { stream: true });
		const zeilen = puffer.split('\n');
		puffer = zeilen.pop() ?? '';
		for (const rohzeile of zeilen) {
			const zeile = rohzeile.trimEnd();
			if (!zeile || zeile.startsWith(':')) continue;
			if (zeile.startsWith('event:')) {
				name = zeile.slice(6).trim();
				continue;
			}
			if (!zeile.startsWith('data:')) continue;
			const roh = zeile.slice(5).trim();
			if (!roh || roh === '[DONE]') {
				name = '';
				continue;
			}
			let daten: Record<string, unknown> = {};
			try {
				daten = JSON.parse(roh) as Record<string, unknown>;
			} catch {
				daten = { text: roh };
			}
			const art = name || String(daten.type ?? daten.event ?? 'text');
			beiEreignis({ art, daten });
			name = '';
		}
	}
}
