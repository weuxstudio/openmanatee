<script lang="ts">
	import Icon from '$lib/Icon.svelte';
	import Hinweis from '$lib/Hinweis.svelte';
	import { sitzung } from '$lib/sitzung.svelte';
	import { boardLaden, ZUSTAND_TEXT, type BoardAufgabe } from '$lib/board';
import { routinenLaden, routinenZahl, type Routine } from '$lib/routinen';

	let aufgaben = $state<BoardAufgabe[]>([]);
	let beispiel = $state(false);
	let fehler = $state<string | null>(null);
	let geladen = $state(false);

	async function laden(): Promise<void> {
		const b = await boardLaden();
		aufgaben = b.aufgaben ?? [];
		beispiel = b.beispiel;
		fehler = b.fehler ?? null;
		geladen = true;
	}

	// Die Pruefung der Verbindung laeuft im Layout und kann laenger dauern als diese
	// Seite. Deshalb hier auf den Zustand achten statt einmal beim Aufbau zu laden.
	$effect(() => {
		if (sitzung.echt && !geladen) void laden();
	});

	let routinen = $state<Routine[]>([]);
	let routinenBeispiel = $state(false);
	let routinenFehler = $state<string | null>(null);
	let routinenGeladen = $state(false);

	async function routinenHolen(): Promise<void> {
		const r = await routinenLaden();
		routinen = r.routinen;
		routinenBeispiel = r.beispiel;
		routinenFehler = r.fehler ?? null;
		routinenGeladen = true;
	}

	// Die Routinen kommen aus der Auftragsliste des Harness. Ohne Tuer antwortet die
	// Route mit Beispielen, damit der erste Besuch einer frischen Kopie etwas zeigt.
	$effect(() => {
		if (sitzung.geprueft && !sitzung.anmeldungNoetig && !routinenGeladen) void routinenHolen();
	});
</script>

<header class="kopf">
	<h1 class="titel">Aufgaben</h1>
	<button class="rund" aria-label="Aufgabe anlegen"><Icon name="plus" groesse={19} /></button>
</header>
<div class="unter">
	{sitzung.echt ? 'Was die Experten gerade tun.' : 'Was heute läuft und was wartet.'}
</div>

{#if beispiel || !sitzung.echt}
	<Hinweis
		text="Beispieldaten. Die Aufgaben kommen gerade nicht von deinem Harness."
		klein={fehler ?? ''}
	/>
{:else if fehler}
	<Hinweis text="Board nicht lesbar." klein={fehler} />
{/if}

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

<h2 class="abschnitt">Routinen</h2>

{#if routinenBeispiel}
	<Hinweis
		text="Beispieldaten. Die Routinen kommen gerade nicht von deinem Harness."
		klein={routinenFehler ?? ''}
	/>
{:else if routinenFehler}
	<Hinweis text="Auftragsliste nicht lesbar." klein={routinenFehler} />
{/if}

{#if routinen.length}
	<div class="unter" style="padding:0 0 6px">{routinenZahl(routinen)}</div>
	<div class="zeilen">
		{#each routinen as r (r.name)}
			<div class="zeile-liste breit">
				<div class="spalte">
					<span class="text">{r.name}</span>
					<span class="leise">
						{r.art} · {r.zeitplan}{r.naechster
							? ` · nächster Lauf ${r.naechster}`
							: ' · pausiert'}{r.letzter ? ` · letzter Lauf ${r.letzter}` : ''}
					</span>
				</div>
				<div class="rechts">
					<span class="zustand" class:laeuft={r.zustand === 'laeuft'} class:ruht={r.zustand === 'ruht'}>
						<i></i>{r.zustand === 'laeuft' ? 'aktiv' : 'pausiert'}
					</span>
				</div>
			</div>
		{/each}
	</div>
{:else if routinenGeladen}
	<div class="zeilen">
		<div class="zeile-liste">
			<span class="text">Noch keine Routine eingerichtet.</span>
		</div>
	</div>
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
