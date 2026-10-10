/**
 * Zeit in Worten, wie die Oberflaeche sie braucht.
 *
 * Reine Funktionen ohne Zugriff auf die Maschine: der Gruss richtet sich nach
 * der Uhrzeit, ein Zeitpunkt wird kurz und lesbar. Beides ist damit pruefbar,
 * ohne eine Uhr zu stellen.
 */

/** "Guten Morgen" ab 5, "Guten Tag" ab 11, "Guten Abend" ab 18, sonst "Gute Nacht". */
export function grussZeit(stunde: number): string {
	if (!Number.isFinite(stunde)) return 'Hallo';
	const h = ((Math.floor(stunde) % 24) + 24) % 24;
	if (h >= 5 && h < 11) return 'Guten Morgen';
	if (h >= 11 && h < 18) return 'Guten Tag';
	if (h >= 18 && h < 23) return 'Guten Abend';
	return 'Gute Nacht';
}

function zwei(n: number): string {
	return String(n).padStart(2, '0');
}

/**
 * Ein Zeitpunkt kurz: "21:01" heute, "morgen 07:00" am naechsten Tag, sonst
 * "11.10. 20:00". `jetzt` ist zum Pruefen da.
 */
export function kurzZeit(iso: string, jetzt: Date = new Date()): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	const uhr = `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
	if (d.toDateString() === jetzt.toDateString()) return uhr;
	const morgen = new Date(jetzt.getTime());
	morgen.setDate(morgen.getDate() + 1);
	if (d.toDateString() === morgen.toDateString()) return `morgen ${uhr}`;
	return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}. ${uhr}`;
}
