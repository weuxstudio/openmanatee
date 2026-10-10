import { describe, expect, it } from 'vitest';
import { ARTEN, bausteinAusText } from './bausteine';

/** One raw block per kind, with the shape the parser must hand back. */
const BEISPIELE: { art: string; roh: unknown; erwartet: Record<string, unknown> }[] = [
	{
		art: 'liste',
		roh: {
			art: 'liste',
			titel: 'Heute',
			eintraege: [{ titel: 'Bericht', rest: 'bis 12 Uhr', unter: ['Zahlen'] }]
		},
		erwartet: { art: 'liste', titel: 'Heute', eintraege: [{ titel: 'Bericht' }] }
	},
	{
		art: 'tabelle',
		roh: { art: 'tabelle', kopf: ['A', 'B'], zeilen: [['a', 'b']] },
		erwartet: { art: 'tabelle', kopf: ['A', 'B'], zeilen: [['a', 'b']] }
	},
	{
		art: 'kennzahl',
		roh: { art: 'kennzahl', werte: [{ marke: 'Umsatz', wert: '12', hinweis: 'Vormonat' }] },
		erwartet: { art: 'kennzahl', werte: [{ marke: 'Umsatz', wert: '12' }] }
	},
	{
		art: 'zeitleiste',
		roh: { art: 'zeitleiste', eintraege: [{ wann: '09:00', was: 'Start', wo: 'Buero' }] },
		erwartet: { art: 'zeitleiste', eintraege: [{ wann: '09:00', was: 'Start' }] }
	},
	{
		art: 'schritte',
		roh: { art: 'schritte', eintraege: [{ titel: 'Lesen', text: 'Kapitel 2', stand: 'fertig' }] },
		erwartet: { art: 'schritte', eintraege: [{ titel: 'Lesen', stand: 'fertig' }] }
	},
	{
		art: 'kalender',
		roh: { art: 'kalender', tage: [{ datum: '01.10.', eintraege: [{ zeit: '10:00', was: 'Termin' }] }] },
		erwartet: { art: 'kalender', tage: [{ datum: '01.10.', eintraege: [{ was: 'Termin' }] }] }
	},
	{
		art: 'ort',
		roh: { art: 'ort', orte: [{ name: 'Buero', adresse: 'Hauptstrasse 1' }] },
		erwartet: { art: 'ort', orte: [{ name: 'Buero' }] }
	},
	{
		art: 'datei',
		roh: { art: 'datei', dateien: [{ pfad: 'documents/kapitel-2.md', hinweis: 'Entwurf' }] },
		erwartet: { art: 'datei', dateien: [{ pfad: 'documents/kapitel-2.md' }] }
	},
	{
		art: 'verweis',
		roh: { art: 'verweis', eintraege: [{ text: 'Quelle', url: 'https://example.org/a', quelle: 'Web' }] },
		erwartet: { art: 'verweis', eintraege: [{ text: 'Quelle', url: 'https://example.org/a' }] }
	},
	{
		art: 'fortschritt',
		roh: { art: 'fortschritt', marke: 'Fertig', anteil: 0.5, text: 'Halbzeit' },
		erwartet: { art: 'fortschritt', marke: 'Fertig', anteil: 0.5 }
	},
	{
		art: 'frage',
		roh: { art: 'frage', text: 'Weiter?', auswahl: ['Ja', 'Nein'] },
		erwartet: { art: 'frage', text: 'Weiter?', auswahl: ['Ja', 'Nein'] }
	}
];

describe('bausteinAusText', () => {
	it('kennt genau die elf Arten', () => {
		expect(ARTEN).toHaveLength(11);
		expect([...ARTEN]).toEqual([
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
		]);
	});

	it.each(BEISPIELE)('$art kommt durch', ({ art, roh, erwartet }) => {
		const b = bausteinAusText(JSON.stringify(roh));
		expect(b).not.toBeNull();
		expect(b?.art).toBe(art);
		expect(b).toMatchObject(erwartet);
	});

	it('liest JSON mit einem Codeblock drumherum', () => {
		const text = [
			'Kurz davor.',
			'```manatee',
			'{"art":"liste","titel":"Heute","eintraege":[{"titel":"Bericht","rest":"bis 12 Uhr"}]}',
			'```',
			'Kurz danach.'
		].join('\n');
		expect(bausteinAusText(text)).toMatchObject({
			art: 'liste',
			titel: 'Heute',
			eintraege: [{ titel: 'Bericht' }]
		});
	});

	it('liest JSON, das mitten in einem Satz steht', () => {
		const text = 'Hier die Zahl: {"art":"kennzahl","werte":[{"marke":"Umsatz","wert":"12"}]} und fertig.';
		expect(bausteinAusText(text)).toMatchObject({
			art: 'kennzahl',
			werte: [{ marke: 'Umsatz', wert: '12' }]
		});
	});

	it('liest JSON mit Leerraum davor und danach', () => {
		expect(bausteinAusText('\n\n  {"art":"frage","text":"Weiter?"}  \n')).toMatchObject({
			art: 'frage',
			text: 'Weiter?'
		});
	});

	it('weist Text ohne JSON ab', () => {
		expect(bausteinAusText('')).toBeNull();
		expect(bausteinAusText('   ')).toBeNull();
		expect(bausteinAusText('nur ein Satz, keine Klammern')).toBeNull();
		expect(bausteinAusText('{')).toBeNull();
		expect(bausteinAusText('[1,2,3]')).toBeNull();
		expect(bausteinAusText('null')).toBeNull();
	});

	it('weist eine unbekannte Art ab', () => {
		expect(bausteinAusText('{"art":"gibtsnicht"}')).toBeNull();
		expect(bausteinAusText('{"art":"liste"}')).toBeNull();
	});

	it('weist eine Art ohne Pflichtinhalt ab', () => {
		expect(bausteinAusText('{"art":"liste","eintraege":[]}')).toBeNull();
		expect(bausteinAusText('{"art":"tabelle","kopf":["A"]}')).toBeNull();
		expect(bausteinAusText('{"art":"kennzahl","werte":[{"marke":"","wert":""}]}')).toBeNull();
		expect(bausteinAusText('{"art":"frage","text":"   "}')).toBeNull();
		expect(bausteinAusText('{"art":"fortschritt","marke":"x","anteil":"keine Zahl"}')).toBeNull();
	});

	it('weist einen Verweis ohne echten Webadresse ab', () => {
		expect(
			bausteinAusText('{"art":"verweis","eintraege":[{"text":"x","url":"javascript:alert(1)"}]}')
		).toBeNull();
		expect(bausteinAusText('{"art":"verweis","eintraege":[{"text":"x","url":"kein link"}]}')).toBeNull();
	});

	it('fortschritt: 42 heisst 42 Prozent, Ueberschwinger werden gekappt', () => {
		expect(bausteinAusText('{"art":"fortschritt","marke":"x","anteil":42}')).toMatchObject({
			anteil: 0.42
		});
		expect(bausteinAusText('{"art":"fortschritt","marke":"x","anteil":1.4}')).toMatchObject({
			anteil: 1
		});
	});
});
