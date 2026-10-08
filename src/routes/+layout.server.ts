/**
 * Data every page needs: the visible brand name and whether a login is set up.
 * The interface uses the second flag to point visitors to /anmelden.
 */
import type { LayoutServerLoad } from './$types';
import { MARKE } from '$lib/server/marke';
import { tuerAktiv } from '$lib/server/tuer';

export const load: LayoutServerLoad = () => ({
	appName: MARKE,
	anmeldung: tuerAktiv()
});
