/**
 * Die Ablage: was im eingestellten Ordner liegt.
 *
 * Der Ordner kommt aus ABLAGE_ORDNER. Ist er nicht gesetzt, sagt die Route das
 * im Klartext, statt einen Ordner zu raten: die App soll nichts behaupten, was
 * sie nicht nachgesehen hat. Die Arbeit steckt in $lib/server/lesen.ts.
 */
import { json } from '@sveltejs/kit';
import { tuerAktiv } from '$lib/server/tuer';
import { ablageLesen } from '$lib/server/lesen';
import { MUSTER_ABLAGE } from '$lib/server/muster';

export async function GET() {
	if (!tuerAktiv()) return json({ dateien: MUSTER_ABLAGE, ordner: '', beispiel: true });

	const { dateien, ordner, fehler } = await ablageLesen();
	return json({ dateien, ordner, fehler: fehler ?? undefined, beispiel: false });
}
