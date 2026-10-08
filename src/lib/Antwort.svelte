<script lang="ts">
	/**
	 * Die Antwort als Schnittstelle, nicht als Textwand.
	 *
	 * Listen werden zu Zeilen mit Haarlinie, Tabellen zu einer echten Tabelle, lange Absaetze
	 * bleiben zusammengeklappt, bis man sie aufklappt. Alles andere bleibt schlichter Text.
	 */
	import { bloecke, inline, LANG } from './antwort';
	import Baustein from './Baustein.svelte';

	let { text }: { text: string } = $props();

	let offen = $state<Record<number, boolean>>({});
	const teile = $derived(bloecke(text));
</script>

<div class="antwort">
	{#each teile as b, i (i)}
		{#if b.art === 'titel'}
			<h3 class="ueberschrift">{@html inline(b.text)}</h3>
		{:else if b.art === 'absatz'}
			<p class="text" class:geklappt={b.text.length > LANG && !offen[i]}>
				{@html inline(b.text)}
			</p>
			{#if b.text.length > LANG}
				<button class="mehr" onclick={() => (offen = { ...offen, [i]: !offen[i] })}>
					{offen[i] ? 'Weniger zeigen' : 'Alles zeigen'}
				</button>
			{/if}
		{:else if b.art === 'liste'}
			<ol class="liste">
				{#each b.eintraege as e, k (k)}
					<li>
						{#if b.nummeriert}<span class="marke">{k + 1}</span>{/if}
						<div class="inhalt">
							{#if e.titel}<span class="titel">{@html inline(e.titel)}</span>{/if}
							{#if e.rest}<span class="rest">{@html inline(e.rest)}</span>{/if}
							{#each e.unter as u, u_i (u_i)}
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
		{:else if b.art === 'baustein'}
			<Baustein b={b.wert} />
		{:else}
			<pre class="kasten">{b.text}</pre>
		{/if}
	{/each}
</div>

<style>
	.antwort {
		display: flex;
		flex-direction: column;
		gap: 7px;
		min-width: 0;
	}

	.text {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		overflow-wrap: break-word;
	}

	/* Lange Absaetze zusammengeklappt, aufklappbar. */
	.text.geklappt {
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.mehr {
		align-self: flex-start;
		margin-top: -2px;
		padding: 0;
		background: none;
		border: 0;
		font: inherit;
		font-size: 12px;
		color: var(--ink2);
		text-decoration: underline;
		cursor: pointer;
	}

	.ueberschrift {
		margin: 4px 0 0;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--ink2);
		letter-spacing: 0.02em;
	}

	.liste {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
	}

	.liste li {
		display: flex;
		gap: 9px;
		padding: 7px 0;
		border-top: 1px solid var(--linie);
	}

	.liste li:first-child {
		border-top: 0;
		padding-top: 2px;
	}

	.marke {
		flex: 0 0 auto;
		min-width: 14px;
		font-size: 12px;
		color: var(--ink3);
		font-variant-numeric: tabular-nums;
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
		border-bottom: 1px solid var(--linie);
		line-height: 1.4;
	}

	.tabelle tr:last-child td {
		border-bottom: 0;
	}

	.kasten {
		margin: 0;
		padding: 9px 10px;
		background: var(--bg);
		border-radius: 10px;
		max-height: 260px;
		overflow: auto;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12px;
		line-height: 1.5;
		color: var(--ink2);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.antwort :global(code) {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12px;
		background: var(--bg);
		padding: 1px 4px;
		border-radius: 5px;
	}

	.antwort :global(a) {
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
