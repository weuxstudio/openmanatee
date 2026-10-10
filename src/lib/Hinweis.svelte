<script lang="ts">
	import Icon from './Icon.svelte';

	/**
	 * One quiet line that names the origin of the shown data.
	 *
	 * `text` is the main line, `klein` an optional second, smaller part that
	 * carries a detail such as the error text of the route. The look stays in
	 * the existing pattern: hairline border, card ground, one yellow accent
	 * through the icon. No alarm red.
	 */
	let { text, klein = '' }: { text: string; klein?: string } = $props();
</script>

<div class="streifen" role="note">
	<Icon name="auge" groesse={18} klasse="gelb" />
	<div class="inhalt">
		<span class="text">{text}</span>
		{#if klein}<span class="klein">{klein}</span>{/if}
	</div>
</div>

<style>
	.streifen {
		display: flex;
		align-items: flex-start;
		gap: 9px;
		padding: 10px 12px;
		margin-bottom: 12px;
		background: var(--card);
		border: 1px solid var(--linie);
		border-radius: 12px;
	}

	.inhalt {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.text {
		font-size: 12.5px;
		color: var(--ink2);
		line-height: 1.45;
	}

	.klein {
		font-size: 12px;
		color: var(--ink3);
		line-height: 1.4;
		overflow-wrap: anywhere;
	}
</style>
