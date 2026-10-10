<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Figur from '$lib/Figur.svelte';
	import Freigabe from '$lib/Freigabe.svelte';
	import Hinweis from '$lib/Hinweis.svelte';
	import Icon from '$lib/Icon.svelte';
	import { sitzung } from '$lib/sitzung.svelte';
	import { START_LEER, kurzSatz, startLaden, type StartStand } from '$lib/start';

	let frage = $state('');
	/** Visible brand, set by the operator through PUBLIC_APP_NAME. */
	const marke = $derived((page.data.appName as string) ?? '');

	let stand = $state<StartStand>(START_LEER);
	let geladen = $state(false);

	async function standHolen(): Promise<void> {
		stand = await startLaden();
		geladen = true;
	}

	// Erst laden, wenn feststeht, dass keine Anmeldung fehlt: sonst antwortet die
	// Route mit 401 und die Seite zeigt einen Fehler statt der Zahlen.
	$effect(() => {
		if (sitzung.geprueft && !sitzung.anmeldungNoetig && !geladen) void standHolen();
	});

	/** Die vier Kacheln tragen, was wirklich da ist, und fuehren zur Seite dahinter. */
	const kacheln = $derived([
		{
			icon: 'haken',
			titel: 'Aufgaben',
			text: `${stand.aufgaben.gesamt} Karten, ${stand.aufgaben.offen} offen`,
			weg: '/aufgaben'
		},
		{
			icon: 'blitz',
			titel: 'Routinen',
			text: `${stand.routinen.gesamt}, davon ${stand.routinen.aktiv} aktiv`,
			weg: '/aufgaben'
		},
		{
			icon: 'ordner',
			titel: 'Ergebnisse',
			text: stand.ergebnisse.anzahl
				? `${stand.ergebnisse.anzahl} Dateien im Ordner`
				: 'noch nichts abgelegt',
			weg: '/ablage'
		},
		{
			icon: 'kalender',
			titel: 'Nächster Lauf',
			text: stand.routinen.naechste[0]
				? `${stand.routinen.naechste[0].wann} ${stand.routinen.naechste[0].name}`
				: 'keiner geplant',
			weg: '/aufgaben'
		}
	]);

	function loss(rolle = 'manatee'): void {
		goto(`/session/${rolle.toLowerCase()}`);
	}

	async function senden(): Promise<void> {
		const t = frage.trim();
		if (!t) return;
		frage = '';
		loss();
		await sitzung.senden(t);
	}

	function laufOderOeffnen(): void {
		if (sitzung.echt) {
			loss();
			return;
		}
		sitzung.starten();
		loss();
	}
</script>

<header class="kopf">
	<div class="kreis-initialen">{marke.slice(0, 2).toUpperCase()}</div>
	<button class="rund" aria-label="Neu" onclick={() => loss()}>
		<Icon name="plus" groesse={19} />
	</button>
</header>

<h1 class="gruss">
	<span class="g1">{stand.gruss},</span>
	<span class="g2">{kurzSatz(stand)}</span>
</h1>

{#if stand.beispiel}
	<Hinweis
		text="Beispieldaten. Diese Zahlen kommen nicht von deinem Rechner."
		klein={stand.fehler ?? ''}
	/>
{:else if stand.fehler}
	<Hinweis text="Nicht alles lesbar." klein={stand.fehler} />
{/if}

<div class="blase" style="margin-top:14px">
	<span>
		{#if stand.ergebnisse.neuestes}
			Neuester Bericht: {stand.ergebnisse.neuestes.name}
		{:else}
			Noch nichts im Ordner abgelegt.
		{/if}
	</span>
	<Icon name="welle" groesse={18} />
</div>

<button class="held" aria-label="Sitzung öffnen" onclick={() => loss()}>
	<Figur rolle="manatee" groesse={168} />
</button>

{#if sitzung.freigabe}
	<div style="padding:2px 0 6px">
		<Freigabe
			daten={sitzung.freigabe}
			einmal={() => sitzung.erlauben('einmal')}
			sitzung={() => sitzung.erlauben('sitzung')}
			ablehnen={() => sitzung.ablehnen()}
		/>
	</div>
{:else if sitzung.laeuft}
	<button class="laufzeile" onclick={() => loss()}>
		<span class="zustand laeuft"><i></i>{marke} arbeitet</span>
		<span class="neben mono">{sitzung.letzterSchritt?.name ?? ''}</span>
		<Icon name="chevron" groesse={16} />
	</button>
{:else}
	<button class="laufzeile" onclick={laufOderOeffnen}>
		<span class="zustand" class:ruht={!sitzung.echt}><i></i>{sitzung.echt ? 'Verbunden' : 'Ohne Harness'}</span>
		<span class="neben">
			{#if stand.routinen.naechste[0]}
				nächster Lauf {stand.routinen.naechste[0].wann}
			{:else}
				keine Routine geplant
			{/if}
		</span>
		<Icon name="chevron" groesse={16} />
	</button>
{/if}

<div class="raster">
	{#each kacheln as k (k.titel)}
		<button class="karte" onclick={() => goto(k.weg)}>
			<div style="margin-bottom:9px"><Icon name={k.icon} groesse={22} /></div>
			<div class="karte-titel">{k.titel}</div>
			<div class="karte-text">{k.text}</div>
		</button>
	{/each}
</div>

<div class="eingabe">
	<div class="eingabe-feld">
		<Icon name="plus" groesse={20} />
		<input
			aria-label="Frage an {marke}"
			placeholder="Frag {marke} alles ..."
			bind:value={frage}
			onkeydown={(e) => e.key === 'Enter' && senden()}
		/>
		<button aria-label="Sprechen"><Icon name="mikro" groesse={20} /></button>
	</div>
	{#if sitzung.anmeldungNoetig}
		<p class="hinweis"><a href="/anmelden">Anmeldung nötig.</a></p>
	{/if}
</div>

<style>
	.held {
		display: grid;
		place-items: center;
		width: 100%;
	}

	.laufzeile {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		background: var(--card);
		border-radius: var(--r-karte);
		padding: 14px 15px;
		box-shadow: var(--schatten);
		margin: 4px 0 2px;
	}

	.laufzeile .neben {
		flex: 1;
		text-align: left;
		font-size: 12.5px;
		color: var(--ink3);
	}

	.raster button {
		text-align: left;
	}
</style>
