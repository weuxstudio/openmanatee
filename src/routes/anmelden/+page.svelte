<script lang="ts">
	/**
	 * One field, one button. The token is checked on the server; the browser
	 * only receives a signed cookie afterwards, never the token itself.
	 */
	import { page } from '$app/state';
	import Figur from '$lib/Figur.svelte';
	import Icon from '$lib/Icon.svelte';

	let { form } = $props();
	const marke = $derived((page.data.appName as string) ?? '');
	const anmeldung = $derived(!!page.data.anmeldung);
</script>

<svelte:head>
	<title>{marke} · Anmelden</title>
</svelte:head>

<header class="kopf">
	<div class="kreis-initialen">{marke.slice(0, 2).toUpperCase()}</div>
</header>

<section class="gruss">
	<div class="g1">Anmeldung</div>
	<div class="g2">Zugang zu {marke}.</div>
</section>

<div class="held">
	<Figur rolle="manatee" groesse={120} />
</div>

{#if anmeldung}
	<form method="POST" class="karte" style="margin-top:14px">
		<div class="karte-titel">Zugangstoken</div>
		<div class="karte-text" style="margin-bottom:10px">
			Den Token setzt der Betreiber der App in <span class="mono">APP_TOKEN</span>.
		</div>
		<div class="eingabe-feld">
			<Icon name="schloss" groesse={20} />
			<input
				type="password"
				name="token"
				placeholder="Token"
				autocomplete="current-password"
			/>
		</div>
		{#if form?.fehler}
			<p class="hinweis">{form.fehler}</p>
		{/if}
		<div style="padding-top:12px">
			<button class="knopf" type="submit">
				<Icon name="pfeil" groesse={19} />
				Anmelden
			</button>
		</div>
	</form>
{:else}
	<div class="karte" style="margin-top:14px">
		<div class="karte-titel">Keine Anmeldung eingerichtet</div>
		<div class="karte-text">
			Ohne <span class="mono">APP_TOKEN</span> läuft die App mit Musterdaten und ohne echten Zugang.
		</div>
	</div>
	<div style="padding-top:12px">
		<a class="knopf" href="/">Zur Startseite</a>
	</div>
{/if}

<style>
	.held {
		display: grid;
		place-items: center;
		padding-top: 6px;
	}
</style>
