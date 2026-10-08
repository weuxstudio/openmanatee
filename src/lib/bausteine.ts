/**
 * Der Bausteinkatalog.
 *
 * Das Modell darf seine Antwort als Baustein schicken, dann zeichnet die App daraus eine Ansicht
 * statt einer Textwand. Hier steht, welche Bausteine es gibt, wie sie aussehen und was der Auftrag
 * an das Modell ist. Alles Fremde faellt durch die Pruefung und wird als Text gezeigt, es kann also
 * nichts kaputt gehen, wenn das Modell sich nicht an die Form haelt.
 */

export type ListenZeile = { titel?: string; rest?: string; unter?: string[] };

export type Baustein =
	| { art: 'liste'; titel?: string; eintraege: ListenZeile[] }
	| { art: 'tabelle'; titel?: string; kopf: string[]; zeilen: string[][] }
	| { art: 'kennzahl'; titel?: string; werte: { marke: string; wert: string; hinweis?: string }[] }
	| { art: 'zeitleiste'; titel?: string; eintraege: { wann: string; was: string; wo?: string }[] }
	| {
			art: 'schritte';
			titel?: string;
			eintraege: { titel: string; text?: string; stand?: 'fertig' | 'laeuft' | 'offen' }[];
	  }
	| { art: 'kalender'; titel?: string; tage: { datum: string; eintraege: { zeit?: string; was: string }[] }[] }
	| { art: 'ort'; titel?: string; orte: { name: string; adresse?: string; hinweis?: string }[] }
	| { art: 'datei'; titel?: string; dateien: { pfad: string; name?: string; hinweis?: string }[] }
	| { art: 'verweis'; titel?: string; eintraege: { text: string; url: string; quelle?: string }[] }
	| { art: 'fortschritt'; titel?: string; marke: string; anteil: number; text?: string }
	| { art: 'frage'; titel?: string; text: string; auswahl?: string[] };

export const ARTEN = [
	'liste',
	'tabelle',
	'kennzahl',
	'zeitleiste',
	'schritte',
	'kalender',
	'ort',
	'datei',
	'verweis',
	'fortschritt',
	'frage'
] as const;

function istObjekt(w: unknown): w is Record<string, unknown> {
	return !!w && typeof w === 'object' && !Array.isArray(w);
}

/** Kurzer Text, laengeres wird gekappt, Leeres faellt weg. */
function text(w: unknown, max = 220): string | undefined {
	if (typeof w !== 'string') return undefined;
	const t = w.trim().replace(/\s+/g, ' ');
	return t ? t.slice(0, max) : undefined;
}

function textListe(w: unknown, max = 12, zeichen = 220): string[] {
	if (!Array.isArray(w)) return [];
	return w.map((z) => text(z, zeichen)).filter((z): z is string => !!z).slice(0, max);
}

function zeilen(w: unknown, max = 100): Record<string, unknown>[] {
	if (!Array.isArray(w)) return [];
	return w.filter(istObjekt).slice(0, max);
}

function stand(w: unknown): 'fertig' | 'laeuft' | 'offen' | undefined {
	return w === 'fertig' || w === 'laeuft' || w === 'offen' ? w : undefined;
}

/** Einen rohen Baustein pruefen. Gibt null zurueck, wenn die Form nicht passt. */
export function deuteBaustein(roh: unknown): Baustein | null {
	if (!istObjekt(roh)) return null;
	const art = roh.art;
	const titel = text(roh.titel, 120);
	if (typeof art !== 'string' || !(ARTEN as readonly string[]).includes(art)) return null;

	if (art === 'liste') {
		const eintraege: ListenZeile[] = [];
		for (const e of zeilen(roh.eintraege)) {
			const t = text(e.titel, 140);
			const r = text(e.rest, 300);
			const u = textListe(e.unter, 6, 300);
			if (t || r) eintraege.push({ titel: t, rest: r, unter: u.length ? u : undefined });
		}
		return eintraege.length ? { art, titel, eintraege } : null;
	}

	if (art === 'tabelle') {
		const kopf = textListe(roh.kopf, 8, 60);
		// Zeilen sind Listen, keine Objekte: hier nicht ueber zeilen() gehen.
		const rohe = Array.isArray(roh.zeilen) ? roh.zeilen.slice(0, 60) : [];
		const daten = rohe
			.map((r) => textListe(r, 8, 300))
			.filter((r) => r.length > 0);
		if (!kopf.length || !daten.length) return null;
		return { art, titel, kopf, zeilen: daten };
	}

	if (art === 'kennzahl') {
		const werte = zeilen(roh.werte, 6)
			.map((w) => ({ marke: text(w.marke, 60) ?? '', wert: text(w.wert, 40) ?? '', hinweis: text(w.hinweis, 120) }))
			.filter((w) => w.marke && w.wert);
		return werte.length ? { art, titel, werte } : null;
	}

	if (art === 'zeitleiste') {
		const eintraege = zeilen(roh.eintraege, 40)
			.map((e) => ({ wann: text(e.wann, 60) ?? '', was: text(e.was, 300) ?? '', wo: text(e.wo, 120) }))
			.filter((e) => e.wann && e.was);
		return eintraege.length ? { art, titel, eintraege } : null;
	}

	if (art === 'schritte') {
		const eintraege = zeilen(roh.eintraege, 20)
			.map((e) => ({ titel: text(e.titel, 140) ?? '', text: text(e.text, 300), stand: stand(e.stand) }))
			.filter((e) => e.titel);
		return eintraege.length ? { art, titel, eintraege } : null;
	}

	if (art === 'kalender') {
		const tage = zeilen(roh.tage, 14)
			.map((t) => ({
				datum: text(t.datum, 60) ?? '',
				eintraege: zeilen(t.eintraege, 12)
					.map((e) => ({ zeit: text(e.zeit, 30), was: text(e.was, 240) ?? '' }))
					.filter((e) => e.was)
			}))
			.filter((t) => t.datum);
		return tage.length ? { art, titel, tage } : null;
	}

	if (art === 'ort') {
		const orte = zeilen(roh.orte, 20)
			.map((o) => ({ name: text(o.name, 120) ?? '', adresse: text(o.adresse, 200), hinweis: text(o.hinweis, 200) }))
			.filter((o) => o.name);
		return orte.length ? { art, titel, orte } : null;
	}

	if (art === 'datei') {
		const dateien = zeilen(roh.dateien, 20)
			.map((d) => {
				const pfad = text(d.pfad, 300) ?? '';
				return { pfad, name: text(d.name, 120) ?? (pfad ? pfad.split('/').pop() : undefined), hinweis: text(d.hinweis, 200) };
			})
			.filter((d) => d.pfad);
		return dateien.length ? { art, titel, dateien } : null;
	}

	if (art === 'verweis') {
		const eintraege = zeilen(roh.eintraege, 20)
			.map((e) => ({ text: text(e.text, 200) ?? '', url: text(e.url, 500) ?? '', quelle: text(e.quelle, 80) }))
			.filter((e) => e.text && /^https?:\/\//i.test(e.url));
		return eintraege.length ? { art, titel, eintraege } : null;
	}

	if (art === 'fortschritt') {
		const marke = text(roh.marke, 120) ?? '';
		const rohAnteil = typeof roh.anteil === 'number' ? roh.anteil : Number(roh.anteil);
		if (!marke || !Number.isFinite(rohAnteil)) return null;
		// 42 heisst 42 Prozent, 0.42 heisst 42 Prozent, 1.4 ist ein Ueberschwinger und wird gekappt.
		const alsAnteil = rohAnteil > 1.5 ? rohAnteil / 100 : rohAnteil;
		const anteil = Math.min(1, Math.max(0, alsAnteil));
		return { art, titel, marke, anteil, text: text(roh.text, 240) };
	}

	if (art === 'frage') {
		const frage = text(roh.text, 300) ?? '';
		if (!frage) return null;
		const auswahl = textListe(roh.auswahl, 5, 80);
		return { art, titel, text: frage, auswahl: auswahl.length ? auswahl : undefined };
	}

	return null;
}

/** Aus dem Text eines Codeblocks einen Baustein lesen. Toleriert Beiwerk um das JSON. */
export function bausteinAusText(inhalt: string): Baustein | null {
	const t = (inhalt ?? '').trim();
	const versuche = [t];
	const klammer = /\{[\s\S]*\}/.exec(t);
	if (klammer) versuche.push(klammer[0]);
	for (const v of versuche) {
		try {
			const gedeutet = deuteBaustein(JSON.parse(v));
			if (gedeutet) return gedeutet;
		} catch {
			/* naechster Versuch */
		}
	}
	return null;
}

/**
 * Der Auftrag an das Modell. Wird bei jeder Anfrage als Zusatzauftrag mitgeschickt, nicht in den
 * Verlauf geschrieben. Kurz halten, er kostet bei jeder Anfrage mit.
 */
export const KATALOG_AUFTRAG = `Oberflaeche: Du darfst deine Antwort zusaetzlich als Baustein schicken, die App zeichnet daraus dann eine Ansicht statt Text.
Form: ein Codeblock mit der Sprache manatee, darin nur JSON, sonst nichts.
Bausteine:
liste {"art":"liste","titel":"?","eintraege":[{"titel":"?","rest":"?","unter":["?"]}]}
tabelle {"art":"tabelle","titel":"?","kopf":["A","B"],"zeilen":[["a","b"]]}
kennzahl {"art":"kennzahl","titel":"?","werte":[{"marke":"?","wert":"?","hinweis":"?"}]}
zeitleiste {"art":"zeitleiste","titel":"?","eintraege":[{"wann":"?","was":"?","wo":"?"}]}
schritte {"art":"schritte","titel":"?","eintraege":[{"titel":"?","text":"?","stand":"fertig|laeuft|offen"}]}
kalender {"art":"kalender","titel":"?","tage":[{"datum":"?","eintraege":[{"zeit":"?","was":"?"}]}]}
ort {"art":"ort","titel":"?","orte":[{"name":"?","adresse":"?","hinweis":"?"}]}
datei {"art":"datei","titel":"?","dateien":[{"pfad":"?","hinweis":"?"}]}
verweis {"art":"verweis","titel":"?","eintraege":[{"text":"?","url":"https://...","quelle":"?"}]}
fortschritt {"art":"fortschritt","titel":"?","marke":"?","anteil":0.5,"text":"?"}
frage {"art":"frage","titel":"?","text":"?","auswahl":["?","?"]}
Regeln: Nimm den Baustein, der am besten passt, hoechstens zwei je Antwort. Ein kurzer Satz davor ist erlaubt. Felder kurz halten, kein Markdown darin. Die Werte selbst stammen aus deiner echten Arbeit. Passt kein Baustein, antworte normal in Text, ohne Baustein.`;
