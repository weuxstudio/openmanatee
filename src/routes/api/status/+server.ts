import { json } from '@sveltejs/kit';
import { BASIS, ECHT, harnessPruefen } from '$lib/server/hermes';
import { APP_VERSION } from '$lib/server/marke';
import { COOKIE_NAME, cookieGueltig, tuerAktiv } from '$lib/server/tuer';
import type { RequestHandler } from './$types';

/**
 * Meldet der Oberflaeche, ob ein Schluessel gesetzt ist. Ohne Schluessel: Musterdaten.
 *
 * Zusaetzlich: die Version der App, ob der Harness antwortet (mit Grund, wenn nicht)
 * und ob eine Anmeldung eingerichtet ist. Diese Route bleibt ohne Cookie erreichbar,
 * damit die Oberflaeche den Anmeldehinweis zeigen kann.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	const stand = await harnessPruefen();
	const angemeldet = !tuerAktiv() || cookieGueltig(cookies.get(COOKIE_NAME));
	return json({
		echt: ECHT,
		// The address of the connected harness is only for people who are in.
		basis: angemeldet && ECHT ? BASIS : null,
		appVersion: APP_VERSION,
		harnessAntwortet: stand.antwortet,
		harnessFehler: stand.fehler,
		anmeldung: tuerAktiv(),
		angemeldet
	});
};
