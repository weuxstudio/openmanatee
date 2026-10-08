<script lang="ts">
	/**
	 * Einen geprueften Baustein zeichnen.
	 *
	 * Jeder Baustein bekommt die Form, die zu seinen Daten passt: Zahlen als Kennzahlenreihe,
	 * Zeitpunkte als Leiste, Wege als Schritte mit Stand. Alles schlicht, Haarlinien, Zahlen in
	 * Monospace.
	 */
	import Icon from './Icon.svelte';
	import { inline } from './antwort';
	import type { Baustein } from './bausteine';

	let { b }: { b: Baustein } = $props();

	function karte(name: string, adresse: string): string {
		return `https://maps.apple.com/?q=${encodeURIComponent(adresse || name)}`;
	}

	function vorschlag(t: string): void {
		window.dispatchEvent(new CustomEvent('openmanatee:frage', { detail: { text: t } }));
	}
</script>

<section class="baustein">
	{#if 'titel' in b && b.titel}
		<h4 class="kopf">{@html inline(b.titel)}</h4>
	{/if}

	{#if b.art === 'liste'}
		<ol class="liste">
			{#each b.eintraege as e, i (i)}
				<li>
					<div class="inhalt">
						{#if e.titel}<span class="titel">{@html inline(e.titel)}</span>{/if}
						{#if e.rest}<span class="rest">{@html inline(e.rest)}</span>{/if}
						{#each e.unter ?? [] as u, u_i (u_i)}
							<span class="unter">{@html inline(u)}</span>
						{/each}
					</div>
				</li>
			{/each}
		</ol>
	{:else if b.art === 'tabelle'}
		<div class="rand">
			<table class="tabelle">
				<thead>
					<tr>{#each b.kopf as k, k_i (k_i)}<th>{@html inline(k)}</th>{/each}</tr>
				</thead>
				<tbody>
					{#each b.zeilen as z, z_i (z_i)}
						<tr>{#each z as zelle, zz (zz)}<td>{@html inline(zelle)}</td>{/each}</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if b.art === 'kennzahl'}
		<div class="kennzahlen">
			{#each b.werte as w, i (i)}
				<div class="kennzahl">
					<span class="zahl">{w.wert}</span>
					<span class="marke">{@html inline(w.marke)}</span>
					{#if w.hinweis}<span class="hinweis">{@html inline(w.hinweis)}</span>{/if}
				</div>
			{/each}
		</div>
	{:else if b.art === 'zeitleiste'}
		<ol class="leiste">
			{#each b.eintraege as e, i (i)}
				<li>
					<span class="wann">{e.wann}</span>
					<span class="was">
						{@html inline(e.was)}
						{#if e.wo}<span class="wo">{@html inline(e.wo)}</span>{/if}
					</span>
				</li>
			{/each}
		</ol>
	{:else if b.art === 'schritte'}
		<ol class="schritte">
			{#each b.eintraege as e, i (i)}
				<li>
					<span class="punkt" class:fertig={e.stand === 'fertig'} class:laeuft={e.stand === 'laeuft'}></span>
					<span class="was">
						<span class="stark">{@html inline(e.titel)}</span>
						{#if e.text}<span class="rest">{@html inline(e.text)}</span>{/if}
					</span>
				</li>
			{/each}
		</ol>
	{:else if b.art === 'kalender'}
		<div class="kalender">
			{#each b.tage as t, i (i)}
				<div class="tag">
					<span class="datum">{t.datum}</span>
					<div class="tag-inhalt">
						{#each t.eintraege as e, e_i (e_i)}
							<span class="termin">
								{#if e.zeit}<span class="zeit">{e.zeit}</span>{/if}
								<span class="was">{@html inline(e.was)}</span>
							</span>
						{:else}
							<span class="leer">nichts</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else if b.art === 'ort'}
		<ul class="orte">
			{#each b.orte as o, i (i)}
				<li>
					<div class="inhalt">
						<span class="titel">{@html inline(o.name)}</span>
						{#if o.adresse}<span class="rest">{@html inline(o.adresse)}</span>{/if}
						{#if o.hinweis}<span class="unter">{@html inline(o.hinweis)}</span>{/if}
					</div>
					<a class="weg" href={karte(o.name, o.adresse ?? '')} target="_blank" rel="noreferrer">
						<Icon name="netz" groesse={13} /> Route
					</a>
				</li>
			{/each}
		</ul>
	{:else if b.art === 'datei'}
		<ul class="dateien">
			{#each b.dateien as d, i (i)}
				<li>
					<span class="name">{d.name}</span>
					<span class="pfad">{d.pfad}</span>
					{#if d.hinweis}<span class="unter">{@html inline(d.hinweis)}</span>{/if}
				</li>
			{/each}
		</ul>
	{:else if b.art === 'verweis'}
		<ul class="verweise">
			{#each b.eintraege as e, i (i)}
				<li>
					<a href={e.url} target="_blank" rel="noreferrer">{@html inline(e.text)}</a>
					<span class="quelle">{e.quelle ?? new URL(e.url).hostname}</span>
				</li>
			{/each}
		</ul>
	{:else if b.art === 'fortschritt'}
		<div class="fortschritt">
			<div class="fort-kopf">
				<span class="stark">{@html inline(b.marke)}</span>
				<span class="prozent">{Math.round(b.anteil * 100)} %</span>
			</div>
			<div class="balken"><div class="fuell" style="width:{Math.round(b.anteil * 100)}%"></div></div>
			{#if b.text}<span class="hinweis">{@html inline(b.text)}</span>{/if}
		</div>
	{:else if b.art === 'frage'}
		<div class="frage">
			<span class="was">{@html inline(b.text)}</span>
			{#if b.auswahl}
				<div class="vorschlaege">
					{#each b.auswahl as a, i (i)}
						<button class="vorschlag" onclick={() => vorschlag(a)}>{a}</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.baustein {
		display: flex;
		flex-direction: column;
		gap: 7px;
		min-width: 0;
	}

	.kopf {
		margin: 3px 0 0;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--ink2);
		letter-spacing: 0.02em;
	}

	.liste {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.liste li {
		padding: 7px 0;
		border-top: 1px solid var(--linie);
	}

	.liste li:first-child {
		border-top: 0;
		padding-top: 2px;
	}

	.inhalt {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.titel {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--ink);
	}

	.stark {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--ink);
	}

	.rest {
		font-size: 13px;
		line-height: 1.45;
		color: var(--ink2);
	}

	.unter {
		font-size: 12px;
		line-height: 1.45;
		color: var(--ink3);
	}

	.rand {
		overflow-x: auto;
	}

	.tabelle {
		border-collapse: collapse;
		width: 100%;
		font-size: 12.5px;
	}

	.tabelle th {
		text-align: left;
		padding: 4px 12px 6px 0;
		font-size: 11px;
		font-weight: 600;
		color: var(--ink3);
		border-bottom: 1px solid var(--linie);
		white-space: nowrap;
	}

	.tabelle td {
		padding: 7px 12px 7px 0;
		color: var(--ink);
		vertical-align: top;
		line-height: 1.4;
		border-bottom: 1px solid var(--linie);
	}

	.tabelle tr:last-child td {
		border-bottom: 0;
	}

	/* Kennzahlen: die Zahl gross, die Marke klein darunter. */
	.kennzahlen {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 22px;
		padding: 2px 0 4px;
	}

	.kennzahl {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 74px;
	}

	.zahl {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 19px;
		font-weight: 500;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
	}

	.marke {
		font-size: 11px;
		color: var(--ink3);
	}

	.hinweis {
		font-size: 12px;
		color: var(--ink3);
		line-height: 1.4;
	}

	.leiste {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.leiste li {
		display: flex;
		gap: 12px;
		padding: 6px 0;
		border-top: 1px solid var(--linie);
		align-items: baseline;
	}

	.leiste li:first-child {
		border-top: 0;
	}

	.wann {
		flex: 0 0 88px;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12px;
		color: var(--ink3);
		font-variant-numeric: tabular-nums;
	}

	.was {
		flex: 1 1 auto;
		min-width: 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--ink);
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.wo {
		font-size: 12px;
		color: var(--ink3);
	}

	.schritte {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.schritte li {
		display: flex;
		gap: 10px;
		padding: 6px 0;
		align-items: flex-start;
	}

	.punkt {
		flex: 0 0 auto;
		width: 8px;
		height: 8px;
		margin-top: 4px;
		border-radius: 50%;
		border: 1.5px solid var(--ink3);
	}

	.punkt.fertig {
		background: var(--ink);
		border-color: var(--ink);
	}

	.punkt.laeuft {
		background: var(--akzent);
		border-color: var(--akzent);
		animation: pulst 1.4s ease-in-out infinite;
	}

	@keyframes pulst {
		0%, 100% { transform: scale(1); opacity: 0.9; }
		50% { transform: scale(1.35); opacity: 1; }
	}

	.kalender {
		display: flex;
		flex-direction: column;
	}

	.tag {
		display: flex;
		gap: 12px;
		padding: 7px 0;
		border-top: 1px solid var(--linie);
		align-items: baseline;
	}

	.tag:first-child {
		border-top: 0;
	}

	.datum {
		flex: 0 0 88px;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12px;
		color: var(--ink2);
		font-variant-numeric: tabular-nums;
	}

	.tag-inhalt {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.termin {
		display: flex;
		gap: 8px;
		align-items: baseline;
	}

	.zeit {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12px;
		color: var(--ink3);
	}

	.leer {
		font-size: 12px;
		color: var(--ink3);
	}

	.orte,
	.dateien,
	.verweise {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.orte li {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		padding: 7px 0;
		border-top: 1px solid var(--linie);
	}

	.orte li:first-child {
		border-top: 0;
	}

	.weg {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: var(--ink2);
		text-decoration: none;
		border-bottom: 1px solid var(--linie);
		padding-bottom: 1px;
	}

	.dateien li {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 7px 0;
		border-top: 1px solid var(--linie);
	}

	.dateien li:first-child {
		border-top: 0;
	}

	.name {
		font-size: 13px;
		font-weight: 600;
		color: var(--ink);
	}

	.pfad {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 11px;
		color: var(--ink3);
		word-break: break-all;
	}

	.verweise li {
		display: flex;
		flex-wrap: wrap;
		gap: 2px 8px;
		align-items: baseline;
		padding: 7px 0;
		border-top: 1px solid var(--linie);
	}

	.verweise li:first-child {
		border-top: 0;
	}

	.verweise a {
		font-size: 13px;
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.quelle {
		font-size: 11px;
		color: var(--ink3);
	}

	.fortschritt {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.fort-kopf {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		align-items: baseline;
	}

	.prozent {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12px;
		color: var(--ink2);
		font-variant-numeric: tabular-nums;
	}

	.balken {
		height: 4px;
		border-radius: 2px;
		background: var(--linie);
		overflow: hidden;
	}

	.fuell {
		height: 100%;
		background: var(--akzent);
	}

	.frage {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.vorschlaege {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.vorschlag {
		padding: 6px 11px;
		border: 1px solid var(--linie);
		border-radius: 999px;
		background: var(--card);
		color: var(--ink);
		font: inherit;
		font-size: 12.5px;
		cursor: pointer;
	}

	.vorschlag:hover {
		border-color: var(--ink3);
	}
</style>
