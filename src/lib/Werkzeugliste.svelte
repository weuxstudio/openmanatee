<script lang="ts">
	/**
	 * Werkzeugzeile in Klartext.
	 *
	 * Sichtbar ist immer nur der laufende Schritt in Menschensprache. Ist er fertig, tritt der
	 * naechste an seine Stelle. Der komplette Verlauf geht auf Klick auf, dort steht zu jedem
	 * Schritt der Aufruf mit Argumenten und die echte Ausgabe.
	 */
	import { fade, slide } from 'svelte/transition';
	import Icon from './Icon.svelte';
	import type { Schritt } from './sitzung.svelte';
	import { BEWEGUNG, SYMBOL, art, satz } from './werkzeug';

	let { schritte, wartet = false }: { schritte: Schritt[]; wartet?: boolean } = $props();

	let verlaufOffen = $state(false);
	let einzelne = $state<Record<number, boolean>>({});

	const jetzt = $derived(schritte.length ? schritte[schritte.length - 1] : null);
	const jetztArt = $derived(jetzt ? art(jetzt.name) : 'sonst');
	const jetztSatz = $derived(jetzt ? satz(jetzt.name, jetzt.arg) : '');
	const jetztLaeuft = $derived(!!jetzt && jetzt.zustand === 'laeuft' && !wartet);
	// Wechselt der Schritt, bekommt die Zeile einen neuen Schluessel und blendet weich ein.
	const schluessel = $derived(jetzt ? `${schritte.length}|${jetzt.name}|${jetzt.arg}` : 'leer');

	function umschalten(i: number): void {
		einzelne = { ...einzelne, [i]: !einzelne[i] };
	}
</script>

<div class="kasten">
	{#if jetzt}
		<button class="jetzt" aria-expanded={verlaufOffen} onclick={() => (verlaufOffen = !verlaufOffen)}>
			{#key schluessel}
				<span class="jetzt-inhalt" in:fade={{ duration: 170 }}>
					<span class="symbol" class:an={jetztLaeuft} data-bewegung={BEWEGUNG[jetztArt]}>
						<Icon name={SYMBOL[jetztArt]} groesse={17} />
					</span>
					<span class="satz">{jetztSatz}</span>
					<span
						class="stand"
						class:laeuft={jetztLaeuft}
						class:fehler={jetzt.zustand === 'fehler'}
					>
						{jetztLaeuft ? 'arbeitet' : jetzt.zustand === 'fehler' ? 'Fehler' : jetzt.dauer || 'fertig'}
					</span>
				</span>
			{/key}
			<span class="verlauf-hinweis">
				{schritte.length > 1 ? `${schritte.length} Schritte` : 'Verlauf'}
			</span>
			<span class="pfeil" class:auf={verlaufOffen}><Icon name="chevron" groesse={15} /></span>
		</button>
	{:else}
		<p class="karte-text" style="padding:8px 0">Noch nichts gelaufen.</p>
	{/if}

	{#if verlaufOffen && schritte.length}
		<div class="verlauf" transition:slide={{ duration: 180 }}>
			{#each schritte as s, i (i)}
				{@const a = art(s.name)}
				<div class="zeile">
					<button class="kopfzeile" aria-expanded={!!einzelne[i]} onclick={() => umschalten(i)}>
						<span class="symbol" data-bewegung={BEWEGUNG[a]}>
							<Icon name={SYMBOL[a]} groesse={16} />
						</span>
						<span class="satz">{satz(s.name, s.arg)}</span>
						<span class="stand" class:fehler={s.zustand === 'fehler'}>
							{s.zustand === 'laeuft' ? (wartet ? 'wartet' : 'laeuft') : s.zustand === 'fehler' ? 'Fehler' : s.dauer || 'fertig'}
						</span>
						<span class="pfeil" class:auf={einzelne[i]}><Icon name="chevron" groesse={14} /></span>
					</button>

					{#if einzelne[i]}
						<div class="detail">
							<div class="d-zeile">
								<span class="d-marke">Aufruf</span>
								<span class="d-wert">{s.name}</span>
							</div>
							{#if s.roh}
								<div class="d-block">
									<span class="d-marke">Argumente</span>
									<pre class="d-kasten">{s.roh}</pre>
								</div>
							{/if}
							{#if s.ausgabe}
								<div class="d-block">
									<span class="d-marke">Ausgabe</span>
									<pre class="d-kasten">{s.ausgabe}</pre>
								</div>
							{/if}
							<div class="d-zeile">
								<span class="d-marke">Stand</span>
								<span class="d-wert">
									{s.zustand === 'laeuft' ? (wartet ? 'wartet auf dich' : 'laeuft') : s.zustand === 'fehler' ? 'Fehler' : 'fertig'}{s.dauer ? ` · ${s.dauer}` : ''}
								</span>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.kasten {
		background: var(--card);
		border-radius: var(--r-karte);
		box-shadow: var(--schatten);
		padding: 2px 14px;
	}

	/* Die sichtbare Zeile: nur der aktuelle Schritt. */
	.jetzt {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 12px 0;
		background: none;
		border: 0;
		text-align: left;
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}

	.jetzt-inhalt {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1 1 auto;
		min-width: 0;
	}

	.symbol {
		display: flex;
		flex: 0 0 auto;
		color: var(--ink2);
		transform-origin: 50% 50%;
	}

	.jetzt:hover .symbol,
	.symbol.an {
		color: var(--akzent);
	}

	.satz {
		flex: 1 1 auto;
		min-width: 0;
		font-size: 13.5px;
		line-height: 1.35;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.stand {
		flex: 0 0 auto;
		font-size: 12px;
		color: var(--ink3);
		white-space: nowrap;
	}

	.stand.laeuft {
		color: var(--akzent);
	}

	.stand.fehler {
		color: #d33b3b;
	}

	.verlauf-hinweis {
		flex: 0 0 auto;
		font-size: 11px;
		color: var(--ink3);
		white-space: nowrap;
	}

	.pfeil {
		display: flex;
		flex: 0 0 auto;
		color: var(--ink3);
		transition: transform 0.18s ease;
	}

	.pfeil.auf {
		transform: rotate(90deg);
	}

	.verlauf {
		border-top: 1px solid var(--linie);
		padding-bottom: 6px;
		overflow: hidden;
	}

	.zeile + .zeile {
		border-top: 1px solid var(--linie);
	}

	.kopfzeile {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px 0;
		background: none;
		border: 0;
		text-align: left;
		color: var(--ink2);
		font: inherit;
		cursor: pointer;
	}

	.kopfzeile .satz {
		font-size: 12.5px;
	}

	.detail {
		padding: 2px 0 12px 26px;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.d-zeile {
		display: flex;
		gap: 8px;
		align-items: baseline;
	}

	.d-marke {
		flex: 0 0 76px;
		font-size: 11px;
		color: var(--ink3);
	}

	.d-block {
		display: flex;
		gap: 8px;
		align-items: baseline;
	}

	.d-block .d-marke {
		flex: 0 0 76px;
	}

	/* Die vollstaendige Ausgabe: alles da, aber in einem eigenen Fenster,
	   damit eine lange Liste die Seite nicht auseinanderzieht. */
	.d-kasten {
		flex: 1 1 auto;
		min-width: 0;
		margin: 0;
		padding: 8px 9px;
		background: var(--bg);
		border-radius: 10px;
		max-height: 240px;
		overflow: auto;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12px;
		line-height: 1.5;
		color: var(--ink2);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.d-wert {
		flex: 1 1 auto;
		min-width: 0;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 12px;
		color: var(--ink2);
		line-height: 1.45;
		word-break: break-word;
		white-space: pre-wrap;
	}

	/* Bewegung nur, solange gearbeitet wird. Ruhend steht das Symbol still. */
	.symbol.an[data-bewegung='schaukelt'] {
		animation: schaukelt 1.5s ease-in-out infinite;
	}
	.symbol.an[data-bewegung='dreht'] {
		animation: dreht 3.2s linear infinite;
	}
	.symbol.an[data-bewegung='wandert'] {
		animation: wandert 1.4s ease-in-out infinite;
	}
	.symbol.an[data-bewegung='wippt'] {
		animation: wippt 0.9s ease-in-out infinite;
	}
	.symbol.an[data-bewegung='blinkt'] {
		animation: blinkt 1.1s steps(2, end) infinite;
	}
	.symbol.an[data-bewegung='pulst'] {
		animation: pulst 1.3s ease-in-out infinite;
	}

	@keyframes schaukelt {
		0%, 100% { transform: rotate(-13deg); }
		50% { transform: rotate(13deg); }
	}
	@keyframes dreht {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	@keyframes wandert {
		0%, 100% { transform: translateY(-1.5px); }
		50% { transform: translateY(1.5px); }
	}
	@keyframes wippt {
		0%, 100% { transform: rotate(-12deg) translateY(0); }
		50% { transform: rotate(4deg) translateY(-1px); }
	}
	@keyframes blinkt {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.35; }
	}
	@keyframes pulst {
		0%, 100% { transform: scale(1); opacity: 0.85; }
		50% { transform: scale(1.14); opacity: 1; }
	}

	@media (prefers-reduced-motion: reduce) {
		.symbol.an {
			animation: none !important;
		}
	}
</style>
