<script lang="ts">
	/**
	 * Figur einer Rolle: weiche Form mit Verlauf, Glanzlicht, Kontaktschatten,
	 * schwarzem Visier und zwei geschwungenen Augen. Unterschieden wird ueber
	 * Form und Farbe, nicht ueber ein Bild.
	 */
	import { AGENTEN, type Form } from './werte';

	let {
		rolle = 'manatee',
		groesse = 64,
		arbeitet = false
	}: { rolle?: string; groesse?: number; arbeitet?: boolean } = $props();

	const r = $derived(AGENTEN[rolle] ?? AGENTEN.manatee);
	const klein = $derived(groesse < 70);
	const kennung = Math.random().toString(36).slice(2, 8);

	type Punkt = [number, number];

	function gerundet(punkte: Punkt[], radius: number): string {
		const n = punkte.length;
		const teile: string[] = [];
		for (let i = 0; i < n; i++) {
			const vor = punkte[(i - 1 + n) % n];
			const p = punkte[i];
			const nach = punkte[(i + 1) % n];
			const v1: Punkt = [vor[0] - p[0], vor[1] - p[1]];
			const v2: Punkt = [nach[0] - p[0], nach[1] - p[1]];
			const l1 = Math.hypot(v1[0], v1[1]) || 1;
			const l2 = Math.hypot(v2[0], v2[1]) || 1;
			const rr = Math.min(radius, l1 / 2.2, l2 / 2.2);
			const a: Punkt = [p[0] + (v1[0] / l1) * rr, p[1] + (v1[1] / l1) * rr];
			const b: Punkt = [p[0] + (v2[0] / l2) * rr, p[1] + (v2[1] / l2) * rr];
			teile.push(`${i === 0 ? 'M' : 'L'}${a[0].toFixed(2)} ${a[1].toFixed(2)}`);
			teile.push(`Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${b[0].toFixed(2)} ${b[1].toFixed(2)}`);
		}
		teile.push('Z');
		return teile.join(' ');
	}

	function formPfad(form: Form, s: number): string {
		const h = s / 2;
		if (form === 'kugel') return `<circle cx="0" cy="0" r="${h.toFixed(1)}"/>`;
		if (form === 'wuerfel') {
			const k = h * 0.9;
			const p: Punkt[] = [
				[-k, -k],
				[k, -k],
				[k, k],
				[-k, k]
			];
			return `<path d="${gerundet(p, s * 0.22)}"/>`;
		}
		if (form === 'dreieck') {
			const p: Punkt[] = [
				[0, -h],
				[h * 0.95, h * 0.78],
				[-h * 0.95, h * 0.78]
			];
			return `<path d="${gerundet(p, s * 0.16)}"/>`;
		}
		if (form === 'sechseck') {
			const p: Punkt[] = [];
			for (let i = 0; i < 6; i++) {
				const a = ((-90 + i * 60) * Math.PI) / 180;
				p.push([h * Math.cos(a), h * Math.sin(a)]);
			}
			return `<path d="${gerundet(p, s * 0.18)}"/>`;
		}
		const p: Punkt[] = [];
		for (let i = 0; i < 10; i++) {
			const a = ((-90 + i * 36) * Math.PI) / 180;
			const rr = i % 2 === 0 ? h : h * 0.52;
			p.push([rr * Math.cos(a), rr * Math.sin(a)]);
		}
		return `<path d="${gerundet(p, s * 0.1)}"/>`;
	}

	const s = $derived(groesse * (klein ? 0.8 : 0.62));
	const vis = $derived(s * (klein ? 0.68 : 0.6));
	const hoch = $derived(r.form === 'dreieck' ? vis * 0.62 : vis * 0.72);
	const auge = $derived(s * (klein ? 0.2 : 0.17));
	const strich = $derived(Math.max(1.6, s * 0.045).toFixed(2));
	const mitte = $derived(groesse / 2);
	const figurPfad = $derived(formPfad(r.form, s));
</script>

<svg
	viewBox="0 0 {groesse} {groesse}"
	width={groesse}
	height={groesse}
	role="img"
	aria-label={r.name ? `Marke ${r.name}` : 'Figur'}
>
	<defs>
		<radialGradient id="g{kennung}" cx="34%" cy="26%" r="78%">
			<stop offset="0%" stop-color={r.hell} />
			<stop offset="52%" stop-color={r.basis} />
			<stop offset="100%" stop-color={r.dunkel} />
		</radialGradient>
		<radialGradient id="sh{kennung}" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color="rgba(20,20,25,0.3)" />
			<stop offset="100%" stop-color="rgba(20,20,25,0)" />
		</radialGradient>
		<radialGradient id="hl{kennung}" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color="rgba(255,255,255,0.95)" />
			<stop offset="100%" stop-color="rgba(255,255,255,0)" />
		</radialGradient>
	</defs>

	<ellipse
		cx={mitte}
		cy={mitte + s * 0.52}
		rx={s * 0.46}
		ry={s * 0.13}
		fill="url(#sh{kennung})"
	/>
	<g class="leib" class:arbeitet>
		<g transform="translate({mitte} {mitte - s * 0.06})" fill="url(#g{kennung})">
			{@html figurPfad}
		</g>
	</g>
	<ellipse
		cx={mitte - s * 0.2}
		cy={mitte - s * 0.3}
		rx={s * 0.16}
		ry={s * 0.11}
		fill="url(#hl{kennung})"
		transform="rotate(-22 {mitte - s * 0.2} {mitte - s * 0.3})"
	/>
	<g transform="translate({mitte} {mitte - s * 0.1})">
		<ellipse cx="0" cy="0" rx={vis / 2} ry={hoch / 2} fill="rgba(16,16,20,0.92)" />
		<g class="augen" class:arbeitet>
			<g fill="none" stroke="#FFF8E6" stroke-width={strich} stroke-linecap="round">
				<path
					d="M{(-auge * 1.15).toFixed(1)} {(auge * 0.3).toFixed(1)} q {(auge * 0.6).toFixed(1)} {(
						-auge * 0.85
					).toFixed(1)} {(auge * 1.2).toFixed(1)} 0"
				/>
				<path
					d="M{(auge * 0.05).toFixed(1)} {(auge * 0.3).toFixed(1)} q {(auge * 0.6).toFixed(1)} {(
						-auge * 0.85
					).toFixed(1)} {(auge * 1.2).toFixed(1)} 0"
				/>
			</g>
		</g>
	</g>
</svg>

<style>
	/* Die Figur lebt: sie atmet ruhig, und beim Arbeiten wird sie wacher.
	   Bewegung liegt auf Huellen ohne eigenes transform, damit die Position der
	   Form aus dem SVG-Attribut erhalten bleibt. */
	.leib {
		animation: atmet 4.2s ease-in-out infinite;
	}

	.augen {
		transform-box: fill-box;
		transform-origin: center;
		animation: blinzelt 5.4s ease-in-out infinite;
	}

	.leib.arbeitet {
		animation-duration: 1.2s;
	}

	.augen.arbeitet {
		animation: blinzelt 2.4s ease-in-out infinite, schaut 2.8s ease-in-out infinite;
	}

	@keyframes atmet {
		0%, 100% { transform: translateY(0) scale(1); }
		50% { transform: translateY(-1.5px) scale(1.012); }
	}

	@keyframes blinzelt {
		0%, 92%, 100% { transform: scaleY(1); }
		95%, 97% { transform: scaleY(0.12); }
	}

	@keyframes schaut {
		0%, 100% { transform: translateX(-0.6px); }
		50% { transform: translateX(0.6px); }
	}

	@media (prefers-reduced-motion: reduce) {
		.leib,
		.augen {
			animation: none !important;
		}
	}
</style>
