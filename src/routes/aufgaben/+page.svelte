<script lang="ts">
	import Icon from '$lib/Icon.svelte';
	import { sitzung } from '$lib/sitzung.svelte';
	import { boardLaden, ZUSTAND_TEXT, type BoardAufgabe } from '$lib/board';

	let aufgaben = $state<BoardAufgabe[]>([]);
	let fehler = $state<string | null>(null);
	let geladen = $state(false);

	async function laden(): Promise<void> {
		const b = await boardLaden();
		aufgaben = b.aufgaben ?? [];
		fehler = b.fehler ?? null;
		geladen = true;
	}

	// Die Pruefung der Verbindung laeuft im Layout und kann laenger dauern als diese
	// Seite. Deshalb hier auf den Zustand achten statt einmal beim Aufbau zu laden.
	$effect(() => {
		if (sitzung.echt && !geladen) void laden();
	});

	const routinen = [
		{ name: 'Preiswächter Garmin', text: 'täglich 09:00', zustand: 'ruht' },
		{ name: 'Kleinanzeigen', text: 'alle 30 Minuten', zustand: 'ruht' },
		{ name: 'Postfach', text: 'alle 5 Minuten', zustand: 'laeuft' }
	];
</script>

<header class="kopf">
	<div class="titel">Aufgaben</div>
	<button class="rund" aria-label="Aufgabe anlegen"><Icon name="plus" groesse={19} /></button>
</header>
<div class="unter">
	{sitzung.echt ? 'Was die Experten gerade tun.' : 'Was heute läuft und was wartet.'}
</div>

{#if sitzung.echt}
	{#if aufgaben.length}
		<div class="zeilen">
			{#each aufgaben as a (a.id)}
				<div class="zeile-liste breit">
					<div class="spalte">
						<span class="text">{a.titel}</span>
						{#if a.ergebnis}
							<span class="leise">{a.ergebnis}</span>
						{/if}
					</div>
					<div class="rechts">
						{#if a.rolle}<span class="rolle">{a.rolle}</span>{/if}
						<span
							class="zustand"
							class:laeuft={a.zustand === 'running' || a.zustand === 'ready'}
							class:ruht={a.zustand === 'done' || a.zustand === 'archived'}
						>
							<i></i>{ZUSTAND_TEXT[a.zustand] ?? a.zustand}
						</span>
					</div>
				</div>
			{/each}
		</div>
	{:else if geladen}
		<div class="zeilen">
			<div class="zeile-liste">
				<span class="text">Noch keine Aufgabe auf dem Board.</span>
			</div>
		</div>
	{/if}
	{#if fehler}
		<p class="hinweis">Board nicht lesbar: {fehler}</p>
	{/if}
{:else}
	<div class="zeilen">
		{#each sitzung.aufgaben as a (a.nr)}
			<div class="zeile-liste">
				<span class="nr">{a.nr}</span>
				<span class="text">{a.text}</span>
				<span class="neben">{a.dauer}</span>
			</div>
		{/each}
	</div>
{/if}

<div class="abschnitt">Routinen</div>

<div class="zeilen">
	{#each routinen as r (r.name)}
		<div class="zeile-liste">
			<span class="text">{r.name}</span>
			<span class="neben">{r.text}</span>
			<span class="zustand" class:ruht={r.zustand === 'ruht'} class:laeuft={r.zustand === 'laeuft'}>
				<i></i>
			</span>
		</div>
	{/each}
</div>

{#if !sitzung.echt}
	<p class="hinweis">Musterdaten. Routinen kommen später über <span class="mono">/api/jobs</span>.</p>
{/if}

<style>
	.zeile-liste.breit {
		align-items: flex-start;
		gap: 12px;
		padding: 12px 0;
	}

	.spalte {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
		flex: 1;
	}

	.leise {
		font-size: 12px;
		color: var(--ink3);
		line-height: 1.42;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.rechts {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
		flex: 0 0 auto;
	}

	.rolle {
		font-size: 12px;
		color: var(--ink2);
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
	}
</style>
