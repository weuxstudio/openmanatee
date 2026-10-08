<script lang="ts">
	import type { Freigabe } from './sitzung.svelte';
	import Icon from './Icon.svelte';

	let {
		daten,
		einmal,
		sitzung: ganze,
		ablehnen
	}: {
		daten: Freigabe;
		einmal: () => void;
		sitzung: () => void;
		ablehnen: () => void;
	} = $props();
</script>

<div class="karte freigabe">
	<div class="freigabe-kopf">
		<span>Freigabe nötig</span>
		<span class="mono" style="text-transform:none;letter-spacing:0">{daten.werkzeug}</span>
	</div>

	<div class="mono freigabe-befehl">{daten.befehl}</div>

	{#if daten.warnung}
		<div class="freigabe-warnung">{daten.warnung}</div>
	{/if}

	<div class="freigabe-knoepfe">
		<button class="knopf" style="flex:1.4" onclick={einmal}>
			<Icon name="check" groesse={18} />
			Einmal erlauben
		</button>
		<button class="knopf hell" onclick={ganze}>Für Sitzung</button>
	</div>
	<button class="knopf leise" style="width:100%;padding:10px 0 2px" onclick={() => ablehnen()}>
		Ablehnen
	</button>
</div>
