<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Leiste from '$lib/Leiste.svelte';
	import { sitzung } from '$lib/sitzung.svelte';

	let { children } = $props();
	const ohneLeiste = $derived(page.url.pathname.startsWith('/session'));
	/** Visible brand, set by the operator through PUBLIC_APP_NAME. */
	const marke = $derived((page.data.appName as string) ?? '');

	onMount(() => {
		void sitzung.pruefen();
	});
</script>

<svelte:head>
	<title>{marke}</title>
	<meta name="description" content="Dein Agent. Plant, entwirft, recherchiert und liefert." />
</svelte:head>

<main class="huelle" class:ohne-leiste={ohneLeiste}>
	{@render children()}
</main>

{#if !ohneLeiste}
	<Leiste />
{/if}
