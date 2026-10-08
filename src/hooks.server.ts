/**
 * Global guard for the optional token gate.
 *
 * Every server API route except /api/status needs a valid login cookie as
 * soon as a door exists (APP_TOKEN set, or generated because a harness key
 * was found). Without a door there is nothing to protect and nothing to log
 * in to, so the API stays open: /api/hermes/... answers 503 with sample data
 * and /api/board and /api/experten answer built-in examples. The interface
 * needs /api/status open in any case, so it can tell the visitor that a login
 * is configured.
 */
import { json, type Handle } from '@sveltejs/kit';
import { COOKIE_NAME, cookieGueltig, tuerAktiv } from '$lib/server/tuer';

export const handle: Handle = async ({ event, resolve }) => {
	const pfad = event.url.pathname;
	const istApi = pfad.startsWith('/api/') && pfad !== '/api/status';
	if (istApi && tuerAktiv()) {
		if (!cookieGueltig(event.cookies.get(COOKIE_NAME))) {
			return json({ fehler: 'nicht angemeldet' }, { status: 401 });
		}
	}
	return resolve(event);
};
