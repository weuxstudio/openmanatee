/**
 * Visible product identity for a self-hosted copy.
 *
 * PUBLIC_APP_NAME lets an operator rebrand the app without touching code.
 * The protocol identifier between app and model is the lowercase `manatee`
 * (see the code blocks in bausteine.ts); the visible default brand is
 * `OpenManatee`. Nothing here is a secret.
 */
import { env as oeffentlich } from '$env/dynamic/public';
import paket from '../../../package.json';

const VORGABE = 'OpenManatee';

/** Brand shown in the title, the session and the placeholders. */
export const MARKE: string = (oeffentlich.PUBLIC_APP_NAME ?? '').trim() || VORGABE;

/** Version of this app, taken from package.json at build time. */
export const APP_VERSION: string = paket.version ?? '';
