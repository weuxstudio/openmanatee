<script lang="ts">
	import { pfad } from './symbole';

	let {
		name,
		groesse = 22,
		klasse = ''
	}: { name: string; groesse?: number; klasse?: string } = $props();
</script>

<svg
	class={klasse}
	viewBox="0 0 24 24"
	width={groesse}
	height={groesse}
	fill="none"
	stroke="currentColor"
	stroke-width="1.7"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{@html pfad(name)}
</svg>

<style>
	svg {
		display: block;
		flex: 0 0 auto;
	}

	svg.gelb {
		color: var(--akzent);
	}
</style>
