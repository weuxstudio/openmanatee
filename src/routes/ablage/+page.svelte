<script lang="ts">
	import Hinweis from '$lib/Hinweis.svelte';
	import Icon from '$lib/Icon.svelte';
	import { ablageLaden, type AblageDatei } from '$lib/ablage';
	import { sitzung } from '$lib/sitzung.svelte';

	let dateien = $state<AblageDatei[]>([]);
	let ordner = $state('');
	let beispiel = $state(false);
	let fehler = $state<string | null>(null);
	let geladen = $state(false);

	async function laden(): Promise<void> {
		const a = await ablageLaden();
		dateien = a.dateien;
		ordner = a.ordner;
		beispiel = a.beispiel;
		fehler = a.fehler ?? null;
		geladen = true;
	}

	// Der Ordner kommt aus ABLAGE_ORDNER der .env. Erst laden, wenn feststeht, dass
	// keine Anmeldung fehlt: sonst antwortet die Route mit 401 und die Seite zeigt
	// einen Fehler statt der Liste.
	$effect(() => {
		if (sitzung.geprueft && !sitzung.anmeldungNoetig && !geladen) void laden();
	});
</script>

<header class="kopf">
	<h1 class="titel">Ablage</h1>
	<button class="rund" aria-label="Suchen"><Icon name="lupe" groesse={19} /></button>
</header>
<div class="unter">Was der Agent angefasst hat.</div>
{#if ordner}
	<div class="unter mono" style="font-size:12px;padding-top:0">{ordner}</div>
{/if}

{#if beispiel}
	<Hinweis
		text="Beispielinhalt. Diese Seite hängt an keinem echten Ordner."
		klein={fehler ?? ''}
	/>
{:else if fehler}
	<Hinweis text="Ordner nicht lesbar." klein={fehler} />
{/if}

{#if dateien.length}
	<div class="zeilen">
		{#each dateien as d (d.name)}
			<div class="zeile-liste">
				<Icon name={d.ordner ? 'ordner' : 'datei'} groesse={18} />
				<span class="spalte">
					<span class="text mono name">{d.name}</span>
					<span class="leise">{d.ordner ? 'Ordner' : d.groesse} · {d.geaendert}</span>
				</span>
			</div>
		{/each}
	</div>
{:else if geladen && !fehler && !beispiel}
	<div class="zeilen">
		<div class="zeile-liste"><span class="text">In diesem Ordner liegt nichts.</span></div>
	</div>
{/if}

<style>
	/* Lange Dateinamen duerfen die Zeile nicht sprengen, sie werden gekuerzt. */
	.name {
		font-size: 12.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
