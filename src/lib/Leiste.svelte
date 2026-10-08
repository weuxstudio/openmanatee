<script lang="ts">
	import { page } from '$app/state';
	import { LEISTE } from './werte';
	import Icon from './Icon.svelte';

	function aktiv(weg: string): boolean {
		const jetzt = page.url.pathname;
		return weg === '/' ? jetzt === '/' : jetzt.startsWith(weg);
	}
</script>

<nav class="leiste">
	<div class="leiste-inhalt">
		{#each LEISTE as eintrag (eintrag.weg)}
			{#if aktiv(eintrag.weg)}
				<a href={eintrag.weg} class="aktiv" aria-current="page">
					<Icon name={eintrag.icon} groesse={21} klasse="gelb" />
					<span>{eintrag.label}</span>
				</a>
			{:else}
				<a href={eintrag.weg}>
					<Icon name={eintrag.icon} groesse={21} />
					<span>{eintrag.label}</span>
				</a>
			{/if}
		{/each}
	</div>
</nav>
