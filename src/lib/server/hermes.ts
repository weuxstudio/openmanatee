/**
 * Zugang zum Hermes-Server, nur auf dem Server dieser App.
 *
 * Der Schluessel liegt in HERMES_KEY und wird niemals an den Browser
 * ausgeliefert. Der Browser spricht immer mit der App selbst, die App
 * reicht weiter. Damit funktioniert der Zugriff auch vom Handy aus, und
 * der Schluessel steht nicht im ausgelieferten Quelltext.
 */
import { env } from '$env/dynamic/private';

export const BASIS: string = env.HERMES_BASIS ?? 'http://127.0.0.1:8642';

const SCHLUESSEL: string = env.HERMES_KEY ?? '';

export const ECHT: boolean = SCHLUESSEL.length > 0;

export function kopfzeilen(zusatz: Record<string, string> = {}): Headers {
	const k = new Headers(zusatz);
	if (ECHT) k.set('Authorization', `Bearer ${SCHLUESSEL}`);
	return k;
}

/** Anfrage an den Hermes-Server, Antwort unveraendert zurueck. */
export async function weiter(
	weg: string,
	optionen: { method?: string; body?: string; headers?: Record<string, string> } = {}
): Promise<Response> {
	const k = kopfzeilen(optionen.headers);
	if (optionen.body) k.set('Content-Type', 'application/json');
	return fetch(`${BASIS}${weg}`, {
		method: optionen.method ?? 'GET',
		body: optionen.body,
		headers: k
	});
}

/**
 * Short probe so a stranger can see whether app and harness fit together.
 * It never throws: it answers with a reason instead.
 */
export async function harnessPruefen(): Promise<{ antwortet: boolean; fehler: string | null }> {
	if (!ECHT) return { antwortet: false, fehler: 'Kein Schluessel gesetzt (HERMES_KEY fehlt).' };
	try {
		const antwort = await fetch(`${BASIS}/api/sessions`, {
			headers: kopfzeilen(),
			signal: AbortSignal.timeout(3000)
		});
		if (!antwort.ok) {
			return { antwortet: false, fehler: `Harness antwortet mit HTTP ${antwort.status}.` };
		}
		return { antwortet: true, fehler: null };
	} catch (e) {
		return { antwortet: false, fehler: `Harness nicht erreichbar (${BASIS}): ${(e as Error).message}` };
	}
}
