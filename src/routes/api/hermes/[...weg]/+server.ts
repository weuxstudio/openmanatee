/**
 * Durchreiche zum Hermes-Server.
 *
 * /api/hermes/<weg> wird an HERMES_BASIS/<weg> weitergegeben, mit Schluessel,
 * ohne den Schluessel je auszuliefern. Ereignisstroeme laufen unveraendert
 * durch, damit die Oberflaeche sie Zeile fuer Zeile lesen kann.
 */
import { error } from '@sveltejs/kit';
import { ECHT, weiter } from '$lib/server/hermes';
import type { RequestHandler } from './$types';

async function durchreichen({ params, request, url }: Parameters<RequestHandler>[0]) {
	if (!ECHT) throw error(503, 'Kein Schluessel gesetzt, die App laeuft mit Musterdaten.');

	const weg = `/${params.weg ?? ''}${url.search}`;
	const koerper = ['POST', 'PUT', 'PATCH'].includes(request.method) ? await request.text() : undefined;
	const kopf: Record<string, string> = {};
	const accept = request.headers.get('accept');
	if (accept) kopf['Accept'] = accept;

	const antwort = await weiter(weg, { method: request.method, body: koerper, headers: kopf });

	// Strom unveraendert weitergeben, sonst gepufferte Antwort.
	const istStrom = (antwort.headers.get('content-type') ?? '').includes('text/event-stream');
	return new Response(antwort.body, {
		status: antwort.status,
		headers: {
			'Content-Type': antwort.headers.get('content-type') ?? 'application/json',
			...(istStrom ? { 'Cache-Control': 'no-cache', Connection: 'keep-alive' } : {})
		}
	});
}

export const GET: RequestHandler = durchreichen;
export const POST: RequestHandler = durchreichen;
export const PATCH: RequestHandler = durchreichen;
export const DELETE: RequestHandler = durchreichen;
