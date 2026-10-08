<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Figur from '$lib/Figur.svelte';
	import Antwort from '$lib/Antwort.svelte';
	import Freigabe from '$lib/Freigabe.svelte';
	import Icon from '$lib/Icon.svelte';
	import Werkzeugliste from '$lib/Werkzeugliste.svelte';
	import { sitzung } from '$lib/sitzung.svelte';
	import { AGENTEN } from '$lib/werte';

	/** The key of the main role; its visible label is PUBLIC_APP_NAME. */
	const HAUPT = 'manatee';
	const kennung = $derived(decodeURIComponent(page.params.id ?? HAUPT));
	const marke = $derived((page.data.appName as string) ?? '');
	const rolle = $derived.by(() => {
		const gesucht = kennung.toLowerCase();
		// Unknown or brand-derived keys fall back to the main role.
		return Object.keys(AGENTEN).find((k) => k.toLowerCase() === gesucht) ?? HAUPT;
	});
	const daten = $derived(AGENTEN[rolle]);
	const istHaupt = $derived(rolle === HAUPT);

	const vorschlaege = ['Zeig meinen Kalender', 'Sortiere meine Mails'];
	let frage = $state('');
	let sekunden = $state(0);

	// Der Baustein "frage" schlaegt Antworten vor; ein Klick darauf fuellt das Eingabefeld.
	onMount(() => {
		const horcher = (e: Event) => {
			const t = (e as CustomEvent<{ text?: string }>).detail?.text;
			if (t) frage = t;
		};
		window.addEventListener('openmanatee:frage', horcher);
		return () => window.removeEventListener('openmanatee:frage', horcher);
	});

	// Laufzeit mitzaehlen. Eine Prozentanzeige gibt es nicht: der Server sagt nicht,
	// wie viele Schritte ein Auftrag braucht. Deshalb Zeit und Schrittzahl, keine erfundene Zahl.
	$effect(() => {
		if (!sitzung.laeuft) {
			sekunden = 0;
			return;
		}
		const start = Date.now();
		const uhr = setInterval(() => {
			sekunden = Math.round((Date.now() - start) / 1000);
		}, 1000);
		return () => clearInterval(uhr);
	});

	async function senden(): Promise<void> {
		const t = frage.trim();
		if (!t) return;
		frage = '';
		await sitzung.senden(t);
	}
</script>

<header class="kopf kopf-linie">
	<button class="rund" aria-label="Zurück" onclick={() => goto('/')}>
		<Icon name="zurueck" groesse={19} />
	</button>
	<div class="mitte">
		<span class="name"><i></i>{istHaupt ? marke : daten.name}</span>
		<span class="sub">{daten.zustand === 'immer da' ? 'immer auf deiner Seite' : daten.zustand}</span>
	</div>
	<button class="rund" aria-label="Mehr"><Icon name="mehr" groesse={19} /></button>
</header>

<div class="held" style="padding:8px 0 0">
	<Figur rolle={rolle} groesse={132} arbeitet={sitzung.laeuft} />
</div>

{#each sitzung.nachrichten as n, i (i)}
	{#if n.art === 'agent'}
		<div class="zeile-blase">
			<div style="flex:0 0 34px"><Figur rolle={rolle} groesse={34} /></div>
			<div class="blase agent"><Antwort text={n.text} /></div>
		</div>
	{:else}
		<div class="zeile-blase selbst">
			<div class="blase selbst">{n.text}</div>
		</div>
	{/if}
{/each}

{#if sitzung.kommentar}
	<p class="kommentar">{sitzung.kommentar}</p>
{/if}

{#if sitzung.schritte.length}
	<div style="padding:12px 0 0">
		<Werkzeugliste schritte={sitzung.schritte} wartet={!!sitzung.freigabe} />
	</div>
{/if}

{#if sitzung.laeuft}
	<div class="lauf">
		<span class="lauf-text">
			{sitzung.schritte.length === 0
				? 'Denkt nach'
				: `${sitzung.schritte.length} ${sitzung.schritte.length === 1 ? 'Schritt' : 'Schritte'} bisher`}
			· {sekunden} s
		</span>
		<span class="lauf-balken"><i></i></span>
	</div>
{/if}

{#if sitzung.freigabe}
	<div style="padding:11px 0 0">
		<Freigabe
			daten={sitzung.freigabe}
			einmal={() => sitzung.erlauben('einmal')}
			sitzung={() => sitzung.erlauben('sitzung')}
			ablehnen={() => sitzung.ablehnen()}
		/>
	</div>
{/if}

{#if sitzung.geaenderteDateien.length && sitzung.schritte.length}
	<div class="abschnitt">Dateien</div>
	<div class="zeilen">
		{#each sitzung.geaenderteDateien as d (d.pfad)}
			<div class="zeile-liste">
				<Icon name="datei" groesse={18} />
				<span class="text mono">{d.pfad}</span>
				<span class="neben">{d.art}</span>
			</div>
		{/each}
	</div>
{/if}

{#if !sitzung.laeuft && !sitzung.freigabe && !sitzung.echt}
	<div style="padding:14px 0 0">
		<button class="knopf" onclick={() => sitzung.starten()}>
			<Icon name="pfeil" groesse={19} />
			{sitzung.schritte.length ? 'Weiterlaufen lassen' : 'Starte mit 1'}
		</button>
	</div>
{:else if sitzung.laeuft}
	<div style="padding:14px 0 0">
		<button class="knopf hell" onclick={() => sitzung.stoppen()}>
			<Icon name="stopp" groesse={18} />
			Anhalten
		</button>
	</div>
{/if}

<div class="chips">
	{#each vorschlaege as v (v)}
		<button class="chip" onclick={() => (frage = v, senden())}>{v}</button>
	{/each}
</div>

<div class="eingabe">
	<div class="eingabe-feld">
		<Icon name="plus" groesse={20} />
		<input placeholder="Frag {marke} alles ..." bind:value={frage} onkeydown={(e) => e.key === 'Enter' && senden()} />
		<button aria-label="Sprechen"><Icon name="mikro" groesse={20} /></button>
	</div>
	{#if sitzung.hinweis}
		<p class="hinweis">{sitzung.hinweis}</p>
	{/if}
	{#if sitzung.unbekannt.length}
		<p class="hinweis mono">noch nicht zugeordnet: {sitzung.unbekannt.join(', ')}</p>
	{/if}
</div>

<style>
	.zeile-blase {
		display: flex;
		gap: 9px;
		align-items: flex-start;
		padding: 10px 0 0;
	}

	.zeile-blase.selbst {
		justify-content: flex-end;
	}

	.chip {
		flex: 0 0 auto;
	}

	.kommentar {
		font-size: 12.5px;
		color: var(--ink3);
		padding: 9px 2px 0;
		line-height: 1.45;
	}

	.lauf {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 13px 2px 0;
	}

	.lauf-text {
		font-size: 12px;
		color: var(--ink3);
	}

	/* Unbestimmter Balken: er zeigt Bewegung, keine Menge. Eine Prozentzahl waere geraten. */
	.lauf-balken {
		position: relative;
		display: block;
		height: 3px;
		border-radius: 999px;
		background: #ececef;
		overflow: hidden;
	}

	.lauf-balken i {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 34%;
		border-radius: 999px;
		background: var(--akzent);
		animation: wandert 1.6s ease-in-out infinite;
	}

	@keyframes wandert {
		0% { left: -34%; }
		100% { left: 100%; }
	}

	@media (prefers-reduced-motion: reduce) {
		.lauf-balken i {
			animation: none;
			left: 0;
			width: 100%;
			opacity: 0.5;
		}
	}
</style>
