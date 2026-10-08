<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Figur from '$lib/Figur.svelte';
	import Icon from '$lib/Icon.svelte';
	import { AGENTEN, HAUPT, rollenSchluessel } from '$lib/werte';
	import { boardLaden } from '$lib/board';
	import { expertenLaden, type Experte } from '$lib/experten';
	import { sitzung } from '$lib/sitzung.svelte';

	/** Visible brand, set by the operator through PUBLIC_APP_NAME. */
	const marke = $derived((page.data.appName as string) ?? '');

	const muster = Object.entries(AGENTEN)
		.filter(([k]) => k !== 'manatee' && k !== 'Sonstige')
		.map(([k, v]) => ({ k, ...v }));

	let experten = $state<Experte[]>([]);
	let arbeitet = $state<Set<string>>(new Set());
	let geladen = $state(false);

	async function laden(): Promise<void> {
		const [e, b] = await Promise.all([expertenLaden(), boardLaden()]);
		experten = e;
		const laufend = (b.aufgaben ?? [])
			.filter((a) => a.zustand === 'running')
			.map((a) => a.rolle.toLowerCase());
		arbeitet = new Set(laufend);
		geladen = true;
	}

	// Die Verbindungspruefung laeuft im Layout, deshalb hier auf den Zustand achten.
	$effect(() => {
		if (sitzung.echt && !geladen) void laden();
	});

	function oeffnen(schluessel: string): void {
		goto(`/session/${schluessel.toLowerCase()}`);
	}
</script>

<header class="kopf">
	<div class="titel">Agenten</div>
	<button class="rund" aria-label="Agent anlegen"><Icon name="plus" groesse={19} /></button>
</header>
<div class="unter">{sitzung.echt ? 'Deine Riege, bereit für Aufträge.' : 'Dein Team für jedes Ziel.'}</div>

<button class="karte feature" onclick={() => oeffnen('manatee')}>
	<Figur rolle="manatee" groesse={72} />
	<div style="flex:1;text-align:left">
		<div class="name"><i></i>{marke} · {HAUPT.zustand}</div>
		<div class="karte-text" style="margin-top:3px">{HAUPT.text}</div>
	</div>
	<Icon name="chevron" groesse={18} />
</button>

{#if sitzung.echt}
	<div class="abschnitt">Experten</div>

	{#if experten.length}
		<div class="raster">
			{#each experten as e (e.name)}
				<div class="karte">
					<Figur rolle={rollenSchluessel(e.name)} groesse={60} />
					<div class="karte-titel" style="margin-top:10px">{e.name}</div>
					<div class="karte-text">{e.beschreibung}</div>
					<span class="zustand" class:ruht={!arbeitet.has(e.name)} class:laeuft={arbeitet.has(e.name)}>
						<i></i>{arbeitet.has(e.name) ? 'arbeitet' : 'bereit'}
					</span>
				</div>
			{/each}
		</div>
		<p class="hinweis">
			Angelegt wird im Chat: „Leg einen Experten für … an“. Aufgaben siehst du unter Aufgaben.
		</p>
	{:else if geladen}
		<div class="zeilen">
			<div class="zeile-liste">
				<span class="text">Noch kein Experte angelegt.</span>
			</div>
		</div>
	{/if}
{:else}
	<div class="abschnitt">Deine Agenten</div>

	<div class="raster">
		{#each muster as r (r.k)}
			<button class="karte" onclick={() => oeffnen(r.k)}>
				<Figur rolle={r.k} groesse={60} />
				<div class="karte-titel" style="margin-top:10px">{r.name}</div>
				<div class="karte-text">{r.text}</div>
				<span class="zustand" class:ruht={r.zustand === 'ruht'} class:laeuft={r.zustand === 'plant'}>
					<i></i>{r.zustand}
				</span>
			</button>
		{/each}
		<button class="karte anlegen">
			<Icon name="plus" groesse={22} />
			Agent anlegen
		</button>
	</div>
{/if}

<style>
	button.karte {
		text-align: left;
	}

	button.feature {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
	}
</style>
