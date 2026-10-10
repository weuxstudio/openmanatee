/**
 * Routinen aus der Auftragsliste des Harness, aufbereitet fuer die Oberflaeche.
 *
 * Der Zeitplan liegt als Cron-Ausdruck oder als Kurzform ("every 5m") vor. Fuer
 * die Anzeige wird daraus ein deutscher Kurztext. Was nicht erkannt wird, bleibt
 * im Original stehen: lieber ein roher Ausdruck als eine geratene Bedeutung.
 */

/** Eine Routine, wie die Aufgabenseite sie zeigt. */
export type Routine = {
	name: string;
	/** Zeitplan in Worten, sonst der rohe Ausdruck. */
	zeitplan: string;
	zustand: 'laeuft' | 'ruht';
	/** Naechster Lauf, leer wenn pausiert. */
	naechster: string;
	/** Letzter Lauf mit Ergebnis, leer wenn noch keiner lief. */
	letzter: string;
	/** Skript oder Agent. */
	art: string;
};

const WOCHENTAGE = [
	'sonntags',
	'montags',
	'dienstags',
	'mittwochs',
	'donnerstags',
	'freitags',
	'samstags'
];

function zwei(n: number): string {
	return String(n).padStart(2, '0');
}

/**
 * "0 9 * * 1" wird zu "montags 09:00", "every 5m" zu "alle 5 Minuten".
 *
 * Erkannt werden die Formen, die auf dieser Maschine wirklich vorkommen:
 * jede Minute, "every Nm", taeglich, alle N Tage, ein fester Wochentag.
 */
export function zeitplanText(anzeige: string): string {
	const roh = (anzeige ?? '').trim();
	if (!roh) return '';

	const kurzform = /^every\s+(\d+)\s*m$/i.exec(roh);
	if (kurzform) {
		const n = Number(kurzform[1]);
		return n === 1 ? 'jede Minute' : `alle ${n} Minuten`;
	}

	const felder = roh.split(/\s+/);
	if (felder.length !== 5) return roh;
	const [minute, stunde, tag, monat, wochentag] = felder;
	if (minute === '*' && stunde === '*' && tag === '*' && monat === '*' && wochentag === '*') {
		return 'jede Minute';
	}
	if (monat !== '*') return roh;
	if (!/^\d+$/.test(minute) || !/^\d+$/.test(stunde)) return roh;
	const uhr = `${zwei(Number(stunde))}:${zwei(Number(minute))}`;

	if (tag === '*') {
		if (wochentag === '*') return `taeglich ${uhr}`;
		if (/^\d$/.test(wochentag)) return `${WOCHENTAGE[Number(wochentag)]} ${uhr}`;
		return roh;
	}
	const jederNteTag = /^\*\/(\d+)$/.exec(tag);
	if (jederNteTag && wochentag === '*') return `alle ${jederNteTag[1]} Tage ${uhr}`;
	return roh;
}

/** ISO-Zeitstempel als "16.10. 10:00", leer wenn nichts Brauchbares kommt. */
export function zeitZuText(iso: unknown): string {
	if (typeof iso !== 'string' || !iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}. ${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
}

/**
 * Macht aus einem Eintrag der Auftragsliste eine Routine.
 *
 * Pausierte Routinen bekommen keinen naechsten Lauf: der alte Eintrag aus der
 * Liste waere eine Zusage, die nicht gilt.
 */
export function alsRoutine(roh: Record<string, unknown>): Routine {
	const aktiv = roh.enabled === true && roh.state !== 'paused';
	const status = typeof roh.last_status === 'string' ? roh.last_status : '';
	const letzterLauf = zeitZuText(roh.last_run_at);
	const ergebnis = status === 'ok' ? 'ok' : status ? 'Fehler' : '';
	const letzter = letzterLauf ? [letzterLauf, ergebnis].filter(Boolean).join(' ') : '';
	return {
		name: typeof roh.name === 'string' ? roh.name : 'Routine ohne Namen',
		zeitplan: zeitplanText(String(roh.schedule_display ?? '')),
		zustand: aktiv ? 'laeuft' : 'ruht',
		naechster: aktiv ? zeitZuText(roh.next_run_at) : '',
		letzter,
		art: roh.no_agent === true ? 'Skript' : 'Agent'
	};
}

/** Liest die Liste aus der Datei, gleich ob sie direkt oder unter "jobs" liegt. */
export function alsListe(roh: unknown): Record<string, unknown>[] {
	const inhalt = (roh ?? {}) as Record<string, unknown>;
	if (Array.isArray(roh)) return roh as Record<string, unknown>[];
	const jobs = inhalt.jobs;
	return Array.isArray(jobs) ? (jobs as Record<string, unknown>[]) : [];
}
