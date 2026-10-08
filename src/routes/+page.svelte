<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Figur from '$lib/Figur.svelte';
	import Freigabe from '$lib/Freigabe.svelte';
	import Icon from '$lib/Icon.svelte';
	import { sitzung } from '$lib/sitzung.svelte';
	import { AKTIONEN } from '$lib/werte';

	let frage = $state('');
	/** Visible brand, set by the operator through PUBLIC_APP_NAME. */
	const marke = $derived((page.data.appName as string) ?? '');

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

<section class="gruss">
	<div class="g1">Guten Morgen,</div>
	<div class="g2">Lass uns was<br />bewegen.</div>
</section>

<div class="blase" style="margin-top:14px">
	<span>Hey! Was packen wir heute an?</span>
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
		<span class="zustand ruht"><i></i>{sitzung.echt ? 'Verbunden' : 'Bereit'}</span>
		<span class="neben">{sitzung.echt ? 'Frag mich' : 'Tag planen lassen'}</span>
		<Icon name="chevron" groesse={16} />
	</button>
{/if}

<div class="raster">
	{#each AKTIONEN as a (a.titel)}
		<button class="karte" onclick={() => loss(a.rolle)}>
			<div style="margin-bottom:9px"><Icon name={a.icon} groesse={22} /></div>
			<div class="karte-titel">{a.titel}</div>
			<div class="karte-text">{a.text}</div>
		</button>
	{/each}
</div>

<div class="eingabe">
	<div class="eingabe-feld">
		<Icon name="plus" groesse={20} />
		<input placeholder="Frag {marke} alles ..." bind:value={frage} onkeydown={(e) => e.key === 'Enter' && senden()} />
		<button aria-label="Sprechen"><Icon name="mikro" groesse={20} /></button>
	</div>
	{#if sitzung.anmeldungNoetig}
		<p class="hinweis"><a href="/anmelden">Anmeldung nötig.</a></p>
	{:else if !sitzung.echt}
		<p class="hinweis">Musterdaten, kein Schlüssel gesetzt.</p>
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
		padding: 13px 15px;
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
