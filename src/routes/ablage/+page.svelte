<script lang="ts">
	import Icon from '$lib/Icon.svelte';

	const dateien = [
		{ pfad: 'documents/entwurf-kapitel-2.md', art: 'geschrieben', groesse: '12 KB' },
		{ pfad: 'documents/kapitel-2.md', art: 'gelesen', groesse: '8 KB' },
		{ pfad: 'entwurf/schaubild.png', art: 'gerendert', groesse: '421 KB' }
	];
</script>

<header class="kopf">
	<div class="titel">Ablage</div>
	<button class="rund" aria-label="Suchen"><Icon name="lupe" groesse={19} /></button>
</header>
<div class="unter">Was der Agent angefasst hat.</div>

<div class="zeilen">
	{#each dateien as d (d.pfad)}
		<div class="zeile-liste">
			<Icon name="datei" groesse={18} />
			<span class="text mono" style="font-size:12.5px">{d.pfad}</span>
			<span class="neben">{d.art}</span>
		</div>
	{/each}
</div>
