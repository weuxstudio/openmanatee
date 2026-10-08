/**
 * The access door for a self-hosted instance.
 *
 * An instance can drive an agent that owns a terminal, so an optional token
 * gate sits in front of every server API route. The browser never sees the
 * token: after a correct login it gets a cookie that carries only an expiry
 * date plus an HMAC-SHA256 signature made with APP_SECRET.
 *
 * Three clearly separated cases:
 *   1. APP_TOKEN set      -> the gate is active, a cookie is required.
 *   2. APP_TOKEN empty but HERMES_KEY set -> the app generates a random token
 *      at startup, remembers it in .env and shows it exactly once. The gate is
 *      active afterwards; the value in .env always lets the operator back in.
 *   3. Both empty          -> nothing to protect, the gate stays inactive and
 *      the app runs on sample data. No token is generated, nothing is printed.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { appendFileSync, chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';

export const COOKIE_NAME = 'app_zugang';

/** Lifetime of a login cookie: 30 days, in seconds. */
export const GUELTIG_SEKUNDEN = 60 * 60 * 24 * 30;

/** Cookie payload version, so a format change cannot be replayed silently. */
const FASSUNG = 'v1';

const DOTENV = join(process.cwd(), '.env');

function ausUmgebung(name: string): string {
	return (env[name] ?? '').trim();
}

/**
 * Persist a freshly generated value next to the other settings.
 *
 * The existing file is copied to `.env.bak` first, the file stays at mode 0600,
 * and an existing line for the same name is replaced instead of duplicated
 * (that covers the empty `APP_TOKEN=` / `APP_SECRET=` lines from the example).
 */
function wertMerken(name: string, wert: string): void {
	const vorhanden = existsSync(DOTENV);
	const inhalt = vorhanden ? readFileSync(DOTENV, 'utf8') : '';
	if (vorhanden) copyFileSync(DOTENV, `${DOTENV}.bak`);
	const zeile = new RegExp(`^${name}=.*$`, 'm');
	if (zeile.test(inhalt)) {
		writeFileSync(DOTENV, inhalt.replace(zeile, `${name}=${wert}`));
	} else {
		const abschluss = inhalt && !inhalt.endsWith('\n') ? '\n' : '';
		appendFileSync(DOTENV, `${abschluss}${name}=${wert}\n`);
	}
	// The write calls above only apply the mode when they create the file.
	chmodSync(DOTENV, 0o600);
}

/** A fresh secret: 32 random bytes as lowercase hex (64 characters). */
function neuerWert(): string {
	return randomBytes(32).toString('hex');
}

/**
 * Whether a harness key is configured. Read here so the door can decide
 * without importing the Hermes module (and without ever exposing the value).
 */
const HARNESS_KEY = ausUmgebung('HERMES_KEY');

let TOKEN: string = ausUmgebung('APP_TOKEN');
let geheim: string = ausUmgebung('APP_SECRET');
let tokenErzeugt = false;

// A production build imports this module to inspect it; nothing may be written
// or announced then. Only a real server start generates and persists secrets.
if (!building) {
	// Case 2: no APP_TOKEN, but a harness key is configured. Without a gate
	// every visitor would reach an agent with terminal rights, so generate a
	// token, remember it in .env and announce it exactly once.
	if (!TOKEN && HARNESS_KEY) {
		TOKEN = neuerWert();
		tokenErzeugt = true;
		wertMerken('APP_TOKEN', TOKEN);
	}

	if (TOKEN && !geheim) {
		geheim = neuerWert();
		wertMerken('APP_SECRET', geheim);
	}

	if (tokenErzeugt) {
		// One-time startup notice. It carries the generated APP_TOKEN only;
		// the harness key must never reach stdout or a log.
		console.log(
			[
				'',
				'------------------------------------------------------------',
				' Kein APP_TOKEN gesetzt, aber ein Hermes-Schluessel gefunden.',
				' Die App hat einen zufaelligen Zugangstoken erzeugt und in der',
				' .env gespeichert. Er wird nur dieses eine Mal gezeigt:',
				'',
				`   APP_TOKEN=${TOKEN}`,
				'',
				' Anmelden unter /anmelden.',
				'------------------------------------------------------------',
				''
			].join('\n')
		);
	}
}

/** True once the operator set APP_TOKEN or the app generated one. */
export function tuerAktiv(): boolean {
	return TOKEN.length > 0;
}

/** Compare the submitted token in constant time. */
export function tokenStimmt(eingabe: string): boolean {
	const erwartet = Buffer.from(TOKEN, 'utf8');
	const gegeben = Buffer.from(eingabe ?? '', 'utf8');
	if (erwartet.length === 0) return false;
	if (erwartet.length !== gegeben.length) {
		// Do the same work regardless of the input length, then reject.
		timingSafeEqual(erwartet, erwartet);
		return false;
	}
	return timingSafeEqual(erwartet, gegeben);
}

/** True when the request arrived over HTTPS, also behind a reverse proxy. */
export function istHttps(url: URL, request: Request): boolean {
	const weitergeleitet = request.headers.get('x-forwarded-proto');
	if (weitergeleitet) return weitergeleitet.split(',')[0].trim() === 'https';
	return url.protocol === 'https:';
}

function signatur(nutzlast: string): string {
	return createHmac('sha256', geheim).update(nutzlast).digest('hex');
}

/** Build the cookie value: version, expiry, signature. The token is not in it. */
export function cookieBauen(jetzt: number = Date.now()): string {
	const ablauf = Math.floor(jetzt / 1000) + GUELTIG_SEKUNDEN;
	const nutzlast = `${FASSUNG}.${ablauf}`;
	return `${nutzlast}.${signatur(nutzlast)}`;
}

/** Check signature and expiry of a cookie value. */
export function cookieGueltig(wert: string | undefined, jetzt: number = Date.now()): boolean {
	if (!wert) return false;
	const teile = wert.split('.');
	if (teile.length !== 3) return false;
	const [fassung, ablaufRoh, sig] = teile;
	if (fassung !== FASSUNG) return false;
	const ablauf = Number(ablaufRoh);
	if (!Number.isFinite(ablauf) || ablauf <= Math.floor(jetzt / 1000)) return false;
	const erwartet = Buffer.from(signatur(`${fassung}.${ablaufRoh}`), 'utf8');
	const gegeben = Buffer.from(sig, 'utf8');
	if (erwartet.length !== gegeben.length) return false;
	return timingSafeEqual(erwartet, gegeben);
}
