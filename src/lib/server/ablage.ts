/**
 * Kleinigkeiten fuer die Ablageseite.
 *
 * Liegt getrennt von der Route, weil eine SvelteKit-Route ausser ihren
 * Handlern nichts exportieren darf.
 */

/** Groesse in B, KB oder MB, mit Komma wie im Deutschen ueblich. */
export function groesseText(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '';
	if (bytes < 1024) return `${Math.round(bytes)} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1).replace('.', ',')} KB`;
	return `${(kb / 1024).toFixed(1).replace('.', ',')} MB`;
}
