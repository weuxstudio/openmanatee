/**
 * Die Ablage: was im eingestellten Ordner liegt.
 *
 * Der Ordner kommt aus ABLAGE_ORDNER. Ist er nicht gesetzt, sagt die Route das
 * im Klartext, statt einen Ordner zu raten: die App soll nichts behaupten, was
 * sie nicht nachgesehen hat.
 */
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { tuerAktiv } from '$lib/server/tuer';
import { MUSTER_ABLAGE } from '$lib/server/muster';
import { zeitZuText } from '$lib/server/routinen';
import { groesseText } from '$lib/server/ablage';

const KEIN_ORDNER = 'Kein Ordner gesetzt. ABLAGE_ORDNER in der .env auf einen Ordner zeigen lassen.';

export async function GET() {
	if (!tuerAktiv()) return json({ dateien: MUSTER_ABLAGE, ordner: '', beispiel: true });

	const ordner = (env.ABLAGE_ORDNER ?? '').trim();
	if (!ordner) return json({ dateien: [], ordner: '', fehler: KEIN_ORDNER, beispiel: false });

	try {
		const eintraege = await readdir(ordner, { withFileTypes: true });
		const gelesen = [];
		for (const e of eintraege) {
			if (e.name.startsWith('.')) continue;
			const s = await stat(join(ordner, e.name)).catch(() => null);
			if (!s) continue;
			gelesen.push({
				name: e.name,
				ordner: e.isDirectory(),
				groesse: e.isDirectory() ? '' : groesseText(s.size),
				geaendert: zeitZuText(s.mtime.toISOString()),
				zeit: s.mtimeMs
			});
		}
		// Neuestes zuerst, damit oben steht, was gerade entstanden ist.
		gelesen.sort((a, b) => b.zeit - a.zeit);
		const dateien = gelesen.slice(0, 100).map(({ zeit, ...rest }) => rest);
		return json({ dateien, ordner, beispiel: false });
	} catch (e) {
		const roh = e as NodeJS.ErrnoException;
		const meldung =
			roh?.code === 'ENOENT'
				? `Ordner nicht gefunden: ${ordner}`
				: roh?.code === 'ENOTDIR'
					? `Das ist ein Ordner, keine Datei: ${ordner}`
					: (e as Error).message;
		return json({ dateien: [], ordner, fehler: meldung, beispiel: false });
	}
}
