/**
 * Zustand der App.
 *
 * Mit Schluessel kommen Verlauf und Ereignisse vom Hermes-Server: ein Zug ueber
 * `/api/sessions/{id}/chat/stream`, die Schritte aus `tool.started` und
 * `tool.completed`, das Ende aus `run.completed`.
 * Ohne Schluessel laeuft derselbe Ablauf als Muster, damit die Oberflaeche
 * ohne laufenden Server bedienbar und pruefbar bleibt.
 */
import {
	freigabe as freigabeSenden,
	standLaden,
	sitzungAnlegen,
	verlauf,
	zug,
	zugStoppen,
	type Ereignis
} from './api';
import { AGENTEN } from './werte';
import { KATALOG_AUFTRAG } from './bausteine';

export type Schritt = {
	name: string;
	/** Kurzform fuer die Klartextzeile. */
	arg: string;
	/** Rohform des Aufrufs, vollstaendig, geht erst in der aufgeklappten Zeile auf. */
	roh: string;
	/** Ausgabe des Werkzeugs, vollstaendig, falls der Server sie schickt. */
	ausgabe?: string;
	/** Pfad, falls der Schritt eine Datei anfasst. */
	pfad?: string;
	zustand: 'ok' | 'laeuft' | 'fehler';
	dauer: string;
	/** Startzeit, nur waehrend eines Laufs gesetzt. Daraus entsteht die Dauer. */
	seit?: number;
};

export type Freigabe = {
	werkzeug: string;
	befehl: string;
	warnung?: string;
	runId: string;
};

export type Aufgabe = { nr: number; text: string; dauer: string };

export type Nachricht = { art: 'nutzer' | 'agent'; text: string };

const MUSTER_ABLAUF: Omit<Schritt, 'zustand'>[] = [
	{ name: 'read_file', arg: 'kapitel-2.md', roh: '{ path: documents/kapitel-2.md }', pfad: 'documents/kapitel-2.md', dauer: '0,4 s' },
	{ name: 'search_files', arg: 'muster "Fazit" in documents', roh: '{ pattern: "Fazit", path: documents }', dauer: '0,7 s' },
	{ name: 'terminal', arg: 'rm -rf build/', roh: 'rm -rf build/', dauer: '' },
	{ name: 'write_file', arg: 'entwurf-kapitel-2.md', roh: '{ path: documents/entwurf-kapitel-2.md }', pfad: 'documents/entwurf-kapitel-2.md', dauer: '1,2 s' },
	{ name: 'terminal', arg: 'python3 render_manatee.py', roh: 'python3 render_manatee.py', dauer: '2,1 s' }
];

const MUSTER_AUFGABEN: Aufgabe[] = [
	{ nr: 1, text: 'Quartalsbericht und Feedback', dauer: '30 min' },
	{ nr: 2, text: 'Interviewfragen vorbereiten', dauer: '45 min' },
	{ nr: 3, text: 'Beim Designteam nachfassen', dauer: '15 min' }
];

/** Kurzform der Werkzeugargumente fuer die Werkzeugzeile. */
function kurz(wert: unknown): string {
	if (wert === null || wert === undefined) return '';
	if (typeof wert === 'string') return wert;
	if (typeof wert === 'number' || typeof wert === 'boolean') return String(wert);
	if (Array.isArray(wert)) return wert.map((w) => kurz(w)).filter(Boolean).join(' ');
	if (typeof wert === 'object') {
		// Nur die Werte zeigen, nicht die Rohform: {"path": "x"} wird zu "x".
		const teile = Object.values(wert as Record<string, unknown>)
			.map((w) => kurz(w))
			.filter(Boolean);
		const text = teile.join(' ');
		return text.length > 96 ? `${text.slice(0, 93)}...` : text;
	}
	try {
		return String(wert).slice(0, 96);
	} catch {
		return '';
	}
}

/** Kurzform der Argumente: bei Befehlen der Befehl selbst, sonst die Werte. */
function kurzArg(args: unknown): string {
	if (args && typeof args === 'object' && !Array.isArray(args)) {
		const b = (args as Record<string, unknown>).command ?? (args as Record<string, unknown>).cmd;
		if (b) return String(b);
	}
	return kurz(args);
}

/** Rohform des Aufrufs. Vollstaendig, gekappt erst bei sehr langen Ausgaben (4000 Zeichen). */
function kurzRoh(wert: unknown): string {
	if (wert === null || wert === undefined) return '';
	let t: string;
	if (typeof wert === 'string') {
		t = wert;
	} else {
		try {
			t = JSON.stringify(wert, null, 1);
		} catch {
			t = String(wert);
		}
	}
	t = t.replace(/\n\s*/g, ' ').trim();
	return t.length > 4000 ? `${t.slice(0, 3997)}...` : t;
}

/** Volltext einer Ausgabe, ohne Kuerzung. */
function vollText(wert: unknown): string {
	if (wert === null || wert === undefined) return '';
	const t = String(wert).replace(/\r/g, '');
	return t.length > 20000 ? `${t.slice(0, 19997)}...` : t;
}

/** Werkzeugargumente deuten: der Verlauf liefert sie als Zeichenkette mit JSON darin. */
function argsDeuten(wert: unknown): unknown {
	if (typeof wert !== 'string') return wert ?? '';
	const t = wert.trim();
	if (!t) return '';
	if (t.startsWith('{') || t.startsWith('[')) {
		try {
			return JSON.parse(t);
		} catch {
			return t;
		}
	}
	return t;
}

/** Pfad aus gedeuteten Argumenten, falls vorhanden. */
function pfadAus(args: unknown): string | undefined {
	if (args && typeof args === 'object' && !Array.isArray(args)) {
		const p = (args as Record<string, unknown>).path;
		return p ? String(p) : undefined;
	}
	return undefined;
}

/** Dauer in deutscher Schreibweise; alles unter einem Wimpernschlag heisst "sofort". */
function dauerText(sekunden: number): string {
	if (!Number.isFinite(sekunden) || sekunden < 0.15) return 'sofort';
	if (sekunden < 10) return `${sekunden.toFixed(1).replace('.', ',')} s`;
	return `${Math.round(sekunden)} s`;
}

class Sitzung {
	echt = $state(false);
	geprueft = $state(false);
	/** Main role key; the visible label is PUBLIC_APP_NAME. */
	rolle = 'manatee';
	laeuft = $state(false);
	kennung = $state<string | null>(null);
	schritte = $state<Schritt[]>([]);
	freigabe = $state<Freigabe | null>(null);
	kommentar = $state('');
	nachrichten = $state<Nachricht[]>([]);
	aufgaben = $state<Aufgabe[]>(MUSTER_AUFGABEN);
	geaenderteDateien = $state<{ pfad: string; art: string }[]>([]);
	hinweis = $state<string | null>(null);
	/** Whether the operator set APP_TOKEN. */
	anmeldung = $state(false);
	/** Whether this browser already holds a valid login cookie. */
	angemeldet = $state(true);
	/** Ereignisarten, die die App noch nicht kennt. Nur zur Diagnose. */
	unbekannt = $state<string[]>([]);

	#uhr: ReturnType<typeof setTimeout> | null = null;
	#stelle = 0;
	#abbruch: AbortController | null = null;
	/** Merkt, ob schon Text zu einer offenen Antwort geschrieben wurde. */
	#offen = false;

	/** True while the gate is on and this browser has no valid cookie yet. */
	get anmeldungNoetig(): boolean {
		return this.anmeldung && !this.angemeldet;
	}

	/** Beim Start einmal fragen, ob ein Schluessel gesetzt ist. */
	async pruefen(): Promise<void> {
		const stand = await standLaden();
		this.anmeldung = !!stand.anmeldung;
		this.angemeldet = stand.angemeldet !== false;
		// Without a valid cookie the app stays on sample data instead of firing
		// gated calls that would only come back as 401.
		this.echt = stand.echt && !this.anmeldungNoetig;
		this.geprueft = true;
		if (this.anmeldungNoetig) {
			this.hinweis = 'Anmeldung nötig.';
		}
		if (this.echt) {
			this.nachrichten = [
				{ art: 'agent', text: 'Verbunden. Frag mich, was du brauchst.' }
			];
			try {
				this.kennung = localStorage.getItem('openmanatee.kennung');
			} catch {
				this.kennung = null;
			}
			// Gemerkte Sitzung: die ganze Geschichte nachladen.
			if (this.kennung) void this.verlaufLaden();
		} else if (!this.nachrichten.length) {
			this.nachrichten = [
				{
					art: 'agent',
					text: 'Ich habe Kalender, Postfach und deine laufenden Vorhaben gelesen. Hier ist mein Vorschlag für heute.'
				}
			];
		}
	}

	get offeneFrage(): boolean {
		return this.freigabe !== null;
	}

	get letzterSchritt(): Schritt | null {
		return this.schritte.length ? this.schritte[this.schritte.length - 1] : null;
	}

	/**
	 * Lauf starten. Im Muster laeuft ein geskripteter Ablauf, im echten Betrieb
	 * ist der Zug das Senden einer Nachricht.
	 */
	starten(): void {
		if (this.laeuft || this.echt) return;
		this.schritte = [];
		this.geaenderteDateien = [];
		this.freigabe = null;
		this.hinweis = null;
		this.laeuft = true;
		this.#stelle = 0;
		this.#takt(700);
	}

	#takt(wartezeit: number): void {
		if (this.#uhr) clearTimeout(this.#uhr);
		this.#uhr = setTimeout(() => this.#naechster(), wartezeit);
	}

	#naechster(): void {
		if (!this.laeuft) return;
		const vorlage = MUSTER_ABLAUF[this.#stelle];
		if (!vorlage) {
			this.#fertig();
			return;
		}
		this.schritte = this.schritte.map((s) => {
			if (s.zustand !== 'laeuft') return s;
			this.#dateiMerken(s.name, s.arg);
			return { ...s, zustand: 'ok' as const };
		});
		this.schritte = [...this.schritte, { ...vorlage, zustand: 'laeuft', dauer: '' }];
		this.#stelle += 1;

		// Der loeschende Schritt braucht vorher eine Freigabe. Hier wartet der Lauf,
		// bis entschieden ist, es laeuft nichts weiter.
		if (this.#stelle === 3) {
			this.freigabe = {
				werkzeug: 'terminal',
				befehl: 'rm -rf build/',
				warnung: 'Löscht nur das Build-Verzeichnis. Quelldateien bleiben unberührt.',
				runId: 'muster-lauf'
			};
			return;
		}
		this.#takt(2100);
	}

	#fertig(): void {
		this.schritte = this.schritte.map((s) => ({ ...s, zustand: 'ok', dauer: s.dauer || '0,6 s' }));
		this.laeuft = false;
		this.freigabe = null;
		this.#uhr = null;
	}

	#dateiMerken(name: string, pfad: string): void {
		if (name !== 'read_file' && name !== 'write_file') return;
		if (this.geaenderteDateien.some((d) => d.pfad === pfad)) return;
		this.geaenderteDateien = [
			...this.geaenderteDateien,
			{ pfad, art: name === 'write_file' ? 'geschrieben' : 'gelesen' }
		];
	}

	/**
	 * Den Verlauf der Sitzung holen und daraus Nachrichten und Werkzeugzeilen bauen.
	 *
	 * Damit steht nach dem Neuladen die ganze Geschichte der Aufgabe da, samt Argumenten und
	 * den echten Ausgaben der Werkzeuge. Ohne das zeigt die App nach einem Neuladen nichts,
	 * weil der Ereignisstrom nur den laufenden Zug kennt.
	 */
	async verlaufLaden(): Promise<void> {
		if (!this.echt || !this.kennung) return;
		try {
			const eintraege = await verlauf(this.kennung);
			const nach: Nachricht[] = [];
			const schritte: Schritt[] = [];
			for (const e of eintraege) {
				const rolle = String(e.role ?? '');
				const inhalt = typeof e.content === 'string' ? e.content : '';
				if (rolle === 'user') {
					if (inhalt.trim()) nach.push({ art: 'nutzer', text: inhalt });
					continue;
				}
				if (rolle === 'assistant') {
					if (inhalt.trim()) nach.push({ art: 'agent', text: inhalt });
					for (const auf of e.tool_calls ?? []) {
						const args = argsDeuten(auf?.function?.arguments);
						schritte.push({
							name: String(auf?.function?.name ?? 'werkzeug'),
							arg: kurzArg(args),
							roh: kurzRoh(args),
							pfad: pfadAus(args),
							zustand: 'ok',
							dauer: ''
						});
					}
					continue;
				}
				if (rolle === 'tool') {
					const name = String(e.tool_name ?? '');
					for (let i = schritte.length - 1; i >= 0; i -= 1) {
						if (schritte[i].name === name && !schritte[i].ausgabe) {
							schritte[i].ausgabe = vollText(inhalt);
							break;
						}
					}
				}
			}
			// Nur ersetzen, wenn der Verlauf mindestens so viel weiss wie der laufende Zug.
			if (nach.length >= this.nachrichten.length - 1 && nach.length) this.nachrichten = nach;
			if (schritte.length >= this.schritte.length && schritte.length) this.schritte = schritte;
		} catch (e) {
			this.hinweis = `Verlauf nicht lesbar: ${(e as Error).message}`;
		}
	}

	/** Freigabe beantworten. */
	async erlauben(modus: 'einmal' | 'sitzung'): Promise<void> {
		const f = this.freigabe;
		if (!f) return;
		this.nachrichten = [
			...this.nachrichten,
			{ art: 'nutzer', text: modus === 'einmal' ? 'Einmal erlauben' : 'Für diese Sitzung erlauben' }
		];
		this.freigabe = null;
		if (this.echt && f.runId && f.runId !== 'muster-lauf') {
			await freigabeSenden(f.runId, modus === 'einmal' ? 'allow' : 'allow_session');
			return;
		}
		this.#takt(600);
	}

	async ablehnen(grund = ''): Promise<void> {
		const f = this.freigabe;
		if (!f) return;
		this.nachrichten = [
			...this.nachrichten,
			{ art: 'nutzer', text: grund ? `Abgelehnt: ${grund}` : 'Abgelehnt' }
		];
		this.freigabe = null;
		if (this.echt && f.runId && f.runId !== 'muster-lauf') {
			await freigabeSenden(f.runId, 'deny');
			return;
		}
		this.schritte = [
			...this.schritte,
			{ name: 'abgebrochen', arg: 'auf Anweisung', roh: '', zustand: 'fehler', dauer: '—' }
		];
		this.laeuft = false;
		this.#uhr = null;
	}

	async stoppen(): Promise<void> {
		if (this.#uhr) clearTimeout(this.#uhr);
		this.#uhr = null;
		this.#abbruch?.abort();
		this.#abbruch = null;
		if (this.echt && this.kennung) {
			try {
				await zugStoppen(this.kennung);
			} catch (e) {
				this.hinweis = `Anhalten fehlgeschlagen: ${(e as Error).message}`;
			}
		}
		this.laeuft = false;
		this.freigabe = null;
	}

	/** Text senden. Mit Schluessel laeuft ein echter Zug, sonst antwortet das Muster. */
	async senden(text: string): Promise<void> {
		const sauber = text.trim();
		if (!sauber) return;
		this.nachrichten = [...this.nachrichten, { art: 'nutzer', text: sauber }];

		if (!this.echt) {
			this.nachrichten = [
				...this.nachrichten,
				{
					art: 'agent',
					text: 'Verstanden. Ich lege das als ersten Schritt an und melde mich, sobald ich etwas brauche.'
				}
			];
			return;
		}

		this.laeuft = true;
		this.hinweis = null;
		this.schritte = [];
		this.kommentar = '';
		this.#abbruch = new AbortController();
		try {
			await this.#zugSenden(sauber);
		} catch (e) {
			// Eine gemerkte Sitzung kann auf dem Server verschwunden sein. Dann einmal
			// mit einer frischen Sitzung nachlegen, statt den Zug zu verlieren.
			const grund = (e as Error).message;
			if (grund.includes('404') && this.kennung) {
				this.kennung = null;
				try {
					localStorage.removeItem('openmanatee.kennung');
				} catch {
					/* ohne Speicher geht es auch */
				}
				try {
					await this.#zugSenden(sauber);
				} catch (e2) {
					this.hinweis = `Kein Zug: ${(e2 as Error).message}`;
				}
			} else if ((e as Error).name !== 'AbortError') {
				this.hinweis = `Kein Zug: ${grund}`;
			}
		} finally {
			this.laeuft = false;
			this.#abbruch = null;
			this.schritte = this.schritte.map((s) =>
				s.zustand === 'laeuft' ? { ...s, zustand: 'ok' as const } : s
			);
		}
	}

	/** Sitzung sicherstellen und einen Zug schicken. */
	async #zugSenden(text: string): Promise<void> {
		if (!this.kennung) {
			this.kennung = await sitzungAnlegen();
			try {
				localStorage.setItem('openmanatee.kennung', this.kennung);
			} catch {
				/* ohne Speicher geht es auch */
			}
		}
		await zug(this.kennung, text, (e) => this.#ereignis(e), this.#abbruch?.signal, KATALOG_AUFTRAG);
	}

	/** Ein Ereignis aus dem Strom auf Nachrichten, Schritte und Freigaben abbilden. */
	#ereignis(e: Ereignis): void {
		const d = e.daten;
		switch (e.art) {
			case 'run.started': {
				this.laeuft = true;
				return;
			}
			case 'message.started': {
				this.#offen = false;
				return;
			}
			case 'assistant.delta': {
				const stueck = String(d.text ?? d.delta ?? '');
				if (!stueck) return;
				const letzte = this.nachrichten[this.nachrichten.length - 1];
				if (letzte && letzte.art === 'agent' && this.#offen) {
					this.nachrichten = [
						...this.nachrichten.slice(0, -1),
						{ art: 'agent', text: letzte.text + stueck }
					];
				} else {
					this.nachrichten = [...this.nachrichten, { art: 'agent', text: stueck }];
					this.#offen = true;
				}
				return;
			}
			case 'assistant.completed': {
				// Der Server schickt am Ende den vollstaendigen Text, der ist massgeblich.
				this.#offen = false;
				const fertig = String(d.content ?? '').trim();
				if (!fertig) return;
				const letzte = this.nachrichten[this.nachrichten.length - 1];
				if (letzte && letzte.art === 'agent') {
					this.nachrichten = [
						...this.nachrichten.slice(0, -1),
						{ art: 'agent', text: fertig }
					];
				} else {
					this.nachrichten = [...this.nachrichten, { art: 'agent', text: fertig }];
				}
				return;
			}
			case 'tool.progress': {
				// Fortschritt eines Werkzeugs. Namen mit Unterstrich sind innere Schritte
				// wie das Nachdenken, die gehoeren nicht als Werkzeugzeile in die Liste.
				const name = String(d.tool_name ?? d.tool ?? '');
				if (!name || name.startsWith('_')) return;
				const letzter = this.schritte[this.schritte.length - 1];
				if (letzter && letzter.name === name) {
					const stueck = vollText(d.delta ?? '');
					this.schritte = [
						...this.schritte.slice(0, -1),
						{
							...letzter,
							arg: kurz(String(d.delta ?? letzter.arg)).slice(0, 96),
							ausgabe: stueck || letzter.ausgabe
						}
					];
					return;
				}
				this.schritte = this.schritte.map((s) =>
					s.zustand === 'laeuft' ? { ...s, zustand: 'ok' as const } : s
				);
				this.schritte = [
					...this.schritte,
					{
						name,
						arg: kurz(String(d.delta ?? '')),
						roh: '',
						ausgabe: vollText(d.delta ?? ''),
						zustand: 'laeuft',
						dauer: '',
						seit: Date.now()
					}
				];
				return;
			}
			case 'assistant.commentary': {
				const stueck = String(d.text ?? '');
				if (stueck) this.kommentar = this.kommentar ? `${this.kommentar} ${stueck}` : stueck;
				this.#offen = false;
				return;
			}
			case 'tool.started': {
				this.#offen = false;
				// Belegte Feldnamen des Servers: tool_name, preview, args.
				const name = String(d.tool_name ?? d.tool ?? d.name ?? 'werkzeug');
				const args = d.args ?? d.arguments ?? d.input ?? d.parameter ?? '';
				const pfad =
					args && typeof args === 'object'
						? String((args as Record<string, unknown>).path ?? '')
						: '';
				this.schritte = this.schritte.map((s) =>
					s.zustand === 'laeuft' ? { ...s, zustand: 'ok' as const } : s
				);
				this.schritte = [
					...this.schritte,
					{
						name,
						arg: kurz(d.preview ?? kurzArg(args)),
						roh: kurzRoh(args),
						pfad: pfad || undefined,
						zustand: 'laeuft',
						dauer: '',
						seit: Date.now()
					}
				];
				return;
			}
			case 'tool.completed': {
				const name = String(d.tool_name ?? d.tool ?? d.name ?? '');
				this.schritte = this.schritte.map((s) => {
					if (s.zustand !== 'laeuft' || (name && s.name !== name)) return s;
					const dauer = d.duration_ms
						? dauerText(Number(d.duration_ms) / 1000)
						: s.seit
							? dauerText((Date.now() - s.seit) / 1000)
							: 'fertig';
					return { ...s, zustand: 'ok' as const, dauer };
				});
				const letzter = this.schritte[this.schritte.length - 1];
				if (letzter) this.#dateiMerken(letzter.name, letzter.pfad ?? letzter.arg);
				return;
			}
			case 'approval.required':
			case 'approval.requested': {
				this.#offen = false;
				this.freigabe = {
					werkzeug: String(d.tool ?? d.werkzeug ?? 'werkzeug'),
					befehl: String(d.command ?? d.befehl ?? d.arguments ?? kurz(d.input)),
					warnung: d.reason ? String(d.reason) : undefined,
					runId: String(d.run_id ?? d.runId ?? this.kennung ?? '')
				};
				return;
			}
			case 'done':
			case 'run.completed':
			case 'run.failed':
			case 'run.cancelled': {
				this.#offen = false;
				this.freigabe = null;
				this.kommentar = '';
				this.schritte = this.schritte.map((s) =>
					s.zustand === 'laeuft' ? { ...s, zustand: 'ok' as const, dauer: s.dauer || 'ok' } : s
				);
				// Der Server schliesst den Strom nicht immer, deshalb hier beenden.
				this.laeuft = false;
				if (e.art === 'run.failed') this.hinweis = 'Zug mit Fehler beendet.';
				if (e.art === 'run.cancelled') this.hinweis = 'Zug abgebrochen.';
				this.#abbruch?.abort();
				// Kurz warten, dann den Verlauf holen: erst dort stehen die echten Ausgaben
				// der Werkzeuge, der Ereignisstrom liefert sie nicht mit.
				setTimeout(() => void this.verlaufLaden(), 1500);
				return;
			}
			default: {
				if (!this.unbekannt.includes(e.art)) this.unbekannt = [...this.unbekannt, e.art];
			}
		}
	}

	/** Merkt, ob schon Text zu einer offenen Antwort geschrieben wurde. */

	freigabeFuer(rolle: string): string {
		return AGENTEN[rolle]?.zustand ?? 'ruht';
	}
}

export const sitzung = new Sitzung();
