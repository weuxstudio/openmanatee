/**
 * Login action for the optional token gate.
 *
 * A correct APP_TOKEN sets the signed cookie and redirects to the session.
 * A wrong token returns a clear message and never sets a cookie.
 */
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import {
	COOKIE_NAME,
	GUELTIG_SEKUNDEN,
	cookieBauen,
	istHttps,
	tokenStimmt,
	tuerAktiv
} from '$lib/server/tuer';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		// Without a configured token there is nothing to log into.
		if (!tuerAktiv()) throw redirect(303, '/');

		const daten = await request.formData();
		const eingabe = String(daten.get('token') ?? '');
		if (!tokenStimmt(eingabe)) {
			return fail(401, { fehler: 'Token stimmt nicht.' });
		}

		cookies.set(COOKIE_NAME, cookieBauen(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: istHttps(url, request),
			maxAge: GUELTIG_SEKUNDEN
		});
		throw redirect(303, '/session/manatee');
	}
};
