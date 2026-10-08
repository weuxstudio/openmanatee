/**
 * Werkzeugzeilen in Klartext.
 *
 * Rohnamen wie `search_files` oder `mcp__instagram__reels` gehoeren nicht in die Oberflaeche.
 * Hier wird daraus ein kurzer deutscher Satz und ein Symbol, das zur Aktion passt. Die Rohform
 * bleibt erhalten, sie wandert aber in die aufgeklappte Zeile.
 */

export type Art =
	| 'netz'
	| 'suche'
	| 'lesen'
	| 'schreiben'
	| 'befehl'
	| 'bild'
	| 'merken'
	| 'tafel'
	| 'planen'
	| 'frage'
	| 'zeit'
	| 'faehigkeit'
	| 'sonst';

/** Symbolname je Aktion, aufgeloest in symbole.ts. */
export const SYMBOL: Record<Art, string> = {
	netz: 'netz',
	suche: 'lupe',
	lesen: 'dokument',
	schreiben: 'stift',
	befehl: 'terminal',
	bild: 'auge',
	merken: 'kopf',
	tafel: 'tafel',
	planen: 'haken',
	frage: 'frage',
	zeit: 'kalender',
	faehigkeit: 'stern',
	sonst: 'blitz'
};

/** Wie das Symbol sich beim Arbeiten bewegt. */
export const BEWEGUNG: Record<Art, string> = {
	netz: 'dreht',
	suche: 'schaukelt',
	lesen: 'wandert',
	schreiben: 'wippt',
	befehl: 'blinkt',
	bild: 'pulst',
	merken: 'pulst',
	tafel: 'pulst',
	planen: 'pulst',
	frage: 'pulst',
	zeit: 'pulst',
	faehigkeit: 'wippt',
	sonst: 'pulst'
};

type Regel = { art: Art; muster: RegExp; tun: (obj: string) => string };

/**
 * Reihenfolge ist wichtig: der erste Treffer gewinnt. Namen ohne Praefix (Befehle aus dem
 * Musterablauf) fallen auf die letzte Regel durch.
 */
const REGELN: Regel[] = [
	{ art: 'netz', muster: /^(web_?search|search_web|internet|suche_web)/, tun: (o) => (o ? `Sucht im Netz nach ${o}` : 'Sucht im Netz') },
	{ art: 'netz', muster: /^(web_?extract|web_?fetch|fetch_url|url_lesen)/, tun: (o) => (o ? `Liest eine Seite: ${o}` : 'Liest eine Seite im Netz') },
	{ art: 'suche', muster: /^(search_files|search|find|grep|query)/, tun: (o) => (o ? `Sucht nach ${o}` : 'Sucht in den Dateien') },
	{ art: 'lesen', muster: /^(read_file|read|lies|csv|pdf)/, tun: (o) => (o ? `Liest ${o}` : 'Liest eine Datei') },
	{ art: 'schreiben', muster: /^(write_file|write|schreib|create_file)/, tun: (o) => (o ? `Schreibt ${o}` : 'Schreibt eine Datei') },
	{ art: 'schreiben', muster: /^(patch|edit|replace|str_replace)/, tun: (o) => (o ? `Ändert ${o}` : 'Ändert eine Datei') },
	{ art: 'befehl', muster: /^(terminal|bash|shell|exec|run_command|kommando)/, tun: (o) => (o ? `Führt aus: ${o}` : 'Führt einen Befehl aus') },
	{ art: 'bild', muster: /^(vision|image|bild|screenshot)/, tun: () => 'Sieht sich ein Bild an' },
	{ art: 'merken', muster: /^(memory|erinner|notiz)/, tun: () => 'Merkt sich etwas' },
	{ art: 'tafel', muster: /^(kanban|board|task|auftrag)/, tun: () => 'Arbeitet am Board' },
	{ art: 'tafel', muster: /^(delegate|subagent|agent_)/, tun: () => 'Gibt an einen Helfer ab' },
	{ art: 'planen', muster: /^(todo|plan)/, tun: () => 'Plant die Schritte' },
	{ art: 'frage', muster: /^(clarify|frage|ask)/, tun: () => 'Fragt nach' },
	{ art: 'zeit', muster: /^(cron|job|schedule|timer)/, tun: () => 'Legt einen Zeitplan an' },
	{ art: 'faehigkeit', muster: /^(skill|faehigkeit)/, tun: () => 'Liest eine Fähigkeit' },

	// Namen aus fremden Diensten: enthalten das Wort, stehen aber nicht am Anfang.
	{ art: 'suche', muster: /(such|search|find|reel|video|query)/, tun: (o) => (o ? `Sucht nach ${o}` : 'Sucht') },
	{ art: 'lesen', muster: /(lies|read|get|fetch|load|hole)/, tun: (o) => (o ? `Holt ${o}` : 'Holt etwas') },
	{ art: 'schreiben', muster: /(schreib|write|update|create|send|post|edit)/, tun: (o) => (o ? `Schreibt ${o}` : 'Schreibt etwas') },
	{ art: 'befehl', muster: /^(rm|cd|ls|git|npm|pnpm|python|node|curl|ssh)\b/, tun: (o) => `Führt aus: ${o}` }
];

/** Objekt eines Satzes: erste Zeile, keine Rohform, gekuerzt. */
function objekt(roh: string): string {
	let t = (roh ?? '').split('\n')[0].trim();
	t = t.replace(/^\{|\}$/g, '').replace(/\s+/g, ' ');
	t = t.replace(/^["']|["']$/g, '');
	if (t.length > 66) t = `${t.slice(0, 63)}...`;
	return t;
}

/** Erste Worte eines Befehls, ohne Anfuehrungszeichen. */
function ersteWorte(rest: string): string {
	const t = rest.replace(/^-[a-zA-Z-]+\s*/, '').trim();
	if (!t) return 'etwas';
	const treffer = /["']([^"']+)["']/.exec(t);
	const wort = (treffer ? treffer[1] : t.split(/\s+/)[0] ?? '').trim();
	return wort.length > 30 ? `${wort.slice(0, 27)}...` : wort;
}

/** Letztes Stueck eines Pfades, damit die Zeile kurz bleibt. */
function kurzPfad(rest: string): string {
	const t = rest.replace(/^-[a-zA-Z-]+\s*/, '').trim().split(/\s+/)[0] ?? '';
	const teile = t.split('/').filter(Boolean);
	return teile.length ? teile[teile.length - 1] : t;
}

/**
 * Befehle in Menschensprache. Ziel ist die Absicht, nicht der Befehl:
 * `date "+%Y-%m-%d"` heisst "Sucht Datum und Uhrzeit", nicht "Fuehrt aus: date ...".
 */
const BEFEHLE: { muster: RegExp; tun: (rest: string) => string }[] = [
	{ muster: /^date\b/, tun: () => 'Sucht Datum und Uhrzeit' },
	{ muster: /^(ls|find|fd|tree)\b/, tun: (r) => (r ? `Sucht Dateien in ${kurzPfad(r)}` : 'Sucht Dateien') },
	{ muster: /^(cat|less|more|head|tail|nl|wc)\b/, tun: (r) => (r ? `Liest ${kurzPfad(r)}` : 'Liest eine Datei') },
	{ muster: /^(grep|rg|ag)\b/, tun: (r) => `Sucht im Text nach ${ersteWorte(r)}` },
	{ muster: /^git (status|diff|show)\b/, tun: () => 'Sieht sich die Aenderungen an' },
	{ muster: /^git log\b/, tun: () => 'Sieht sich die Versionsgeschichte an' },
	{ muster: /^git (add|commit|push|pull|fetch|checkout|branch|merge|reset|stash)\b/, tun: () => 'Arbeitet an der Version' },
	{ muster: /^(npm|pnpm|yarn|bun)\s+(install|i|add|ci)\b/, tun: () => 'Installiert Abhaengigkeiten' },
	{ muster: /^(npm|pnpm|yarn|bun)\s+(run\s+)?(build|test|check)\b/, tun: () => 'Uebersetzt und prueft das Projekt' },
	{ muster: /^(python3?|node|ruby|bash|sh|zsh)\b/, tun: () => 'Laesst ein Programm laufen' },
	{ muster: /^curl\b/, tun: () => 'Holt etwas aus dem Netz' },
	{ muster: /^(mkdir|touch)\b/, tun: () => 'Legt etwas Neues an' },
	{ muster: /^(rm|rmdir)\b/, tun: () => 'Raeumt auf' },
	{ muster: /^(cp|mv)\b/, tun: () => 'Ordnet Dateien um' },
	{ muster: /^sleep\b/, tun: () => 'Wartet kurz' },
	{ muster: /^(ps|top|htop|lsof|jobs|pgrep)\b/, tun: () => 'Sieht nach, was gerade laeuft' },
	{ muster: /^(netstat|ss|ping|nc|dig|host)\b/, tun: () => 'Prueft die Netzverbindung' },
	{ muster: /^tailscale\b/, tun: () => 'Prueft das Netz im Tailnet' },
	{ muster: /^(df|du)\b/, tun: () => 'Prueft den Speicherplatz' },
	{ muster: /^(chmod|chown|chgrp)\b/, tun: () => 'Setzt Zugriffsrechte' },
	{ muster: /^(ssh|scp|rsync)\b/, tun: () => 'Verbindet sich mit einem anderen Rechner' },
	{ muster: /^(openssl|gpg)\b/, tun: () => 'Arbeitet mit Schluesseln' },
	{ muster: /^(which|command -v|type)\b/, tun: () => 'Sucht ein Programm' },
	{ muster: /^(sed|awk)\b/, tun: () => 'Aendert Text' },
	{ muster: /^(echo|printf)\b/, tun: () => 'Gibt etwas aus' },
	{ muster: /^(jq|plutil|defaults)\b/, tun: () => 'Verarbeitet Daten' },
	{ muster: /^osascript\b/, tun: () => 'Steuert ein Programm' },
	{ muster: /^(pytest|scripts\/run_tests|npm test)\b/, tun: () => 'Prueft den Code' },
	{ muster: /^(open|say|afplay)\b/, tun: () => 'Oeffnet etwas' },
	{ muster: /^hermes\b/, tun: () => 'Steuert den Agenten' },
	{ muster: /^(brew|pip3?|pipx|gem|cargo|go)\s+(install|add)\b/, tun: () => 'Installiert ein Programm' },
	{ muster: /^(vite|webpack|nodemon)\b/, tun: () => 'Laesst die Vorschau laufen' },
	{ muster: /^(npm|pnpm|yarn|bun)\s+(run\s+)?(dev|start|serve)\b/, tun: () => 'Laesst die Vorschau laufen' },
	{ muster: /^(launchctl|systemctl|brew services)\b/, tun: () => 'Steuert einen Dienst' },
	{ muster: /^(kill|pkill|killall)\b/, tun: () => 'Beendet ein Programm' },
	{ muster: /^(tar|zip|unzip|gzip|gunzip|ditto)\b/, tun: () => 'Packt Dateien' },
	{ muster: /^(sqlite3|psql|mysql|redis-cli)\b/, tun: () => 'Sieht in der Datenbank nach' },
	{ muster: /^(ffmpeg|magick|convert|sips)\b/, tun: () => 'Bearbeitet ein Bild oder Video' },
	{ muster: /^(pdftotext|pdftoppm|pdfinfo)\b/, tun: () => 'Liest ein PDF' },
	{ muster: /^screencapture\b/, tun: () => 'Macht einen Bildschirmabzug' },
	{ muster: /^(ln|readlink)\b/, tun: () => 'Verweist auf eine Datei' },
	{ muster: /^(git|npm|pnpm|docker|colima|kubectl)\b/, tun: () => 'Arbeitet mit Werkzeugen' }
];

/** Ein Befehl als Satz. Fuhrwerksketten wie `cd x && y` werden aufgeloest. */
export function befehlSatz(befehl: string): string {
	let t = (befehl ?? '').trim().replace(/^sudo\s+/, '');
	t = t.replace(/\s*\|\s*head[^\|]*$/, '');
	const teile = t.split('&&').map((s) => s.trim()).filter(Boolean);
	const letzter = teile[teile.length - 1] || t;
	for (const r of BEFEHLE) {
		if (r.muster.test(letzter)) return r.tun(letzter.replace(r.muster, '').trim());
	}
	// Kein Treffer: trotzdem in Menschensprache bleiben. Der Rohbefehl steht im Verlauf,
	// nicht in der sichtbaren Zeile.
	const datei = /[^\s/]+\.(md|txt|json|ya?ml|toml|ts|js|svelte|py|sh|css|html|csv|log|pdf|png|jpe?g|mp4|db|sqlite)\b/i.exec(t);
	if (datei) return `Arbeitet an ${datei[0]}`;
	return 'Arbeitet am Rechner';
}

/** Art der Aktion, damit Symbol und Bewegung passen. */
export function art(werkzeug: string): Art {
	const n = werkzeug.trim().toLowerCase();
	for (const r of REGELN) if (r.muster.test(n)) return r.art;
	return 'sonst';
}

/**
 * Ein kurzer Satz fuer die Zeile. Die Aktion steht vorn, das Objekt dahinter, mehr nicht.
 * Der Rohname bleibt als Kennzeichnung erhalten.
 */
export function satz(werkzeug: string, roh: string, befehl = ''): string {
	const n = werkzeug.trim().toLowerCase();

	// Befehle werden nach ihrer Absicht uebersetzt, nicht nach ihrem Text.
	if (art(werkzeug) === 'befehl') {
		let t = (befehl || roh || '').trim();
		if (!t || t.startsWith('{')) {
			const m = /"(?:command|cmd|befehl)"\s*:\s*"([^"]+)"/.exec(roh || '');
			t = m ? m[1] : '';
		}
		if (t) return befehlSatz(t);
		return 'Arbeitet am Rechner';
	}

	const o = objekt(roh);
	for (const r of REGELN) {
		if (!r.muster.test(n)) continue;
		const gebaut = r.tun(o);
		return gebaut;
	}
	// Ganz unbekannt: Aktion benennen, statt den Rohnamen zu zeigen.
	const tabelle: Record<string, string> = {
		datei: 'Arbeitet an einer Datei',
		netz: 'Arbeitet im Netz',
		befehl: 'Arbeitet am Rechner',
		suche: 'Sucht etwas',
		denken: 'Denkt nach'
	};
	return tabelle[art(werkzeug)] ?? 'Arbeitet';
}
