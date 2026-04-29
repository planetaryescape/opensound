<svelte:head>
	<title>opensound — open source music library tooling</title>
	<meta
		name="description"
		content="Open source tooling for managing your music library. spotify-effect is the first library in the opensound ecosystem."
	/>
</svelte:head>

<script lang="ts">
	import { dev } from '$app/environment';

	const spotifyDocsUrl = 'http://localhost:4321';
	const spotifyProductionUrl = 'https://spotify.opensound.dev';

	const links = {
		github: 'https://github.com/guidefari/opensound',
		product: dev ? spotifyDocsUrl : spotifyProductionUrl
	};
</script>

<div
	class="bg-obsidian text-sand flex min-h-screen items-center justify-center px-4 py-10 font-mono [font-synthesis:none] [-webkit-font-smoothing:antialiased] sm:px-6"
>
	<section class="border-sand/30 flex w-full max-w-3xl flex-col gap-3 rounded-(--radius-ui) border-2 p-6 md:p-8">
		<div class="border-sand/20 flex items-center gap-2 border-b pb-3 text-xs">
			<span class="bg-sand/40 inline-block h-2 w-2 rounded-full"></span>
			<span class="bg-sand/40 inline-block h-2 w-2 rounded-full"></span>
			<span class="bg-sand/40 inline-block h-2 w-2 rounded-full"></span>
			<span class="text-sand/60 ml-2">~/opensound.dev</span>
		</div>
		<div class="flex flex-col gap-2 text-sm sm:text-base">
			<div><span class="text-sky">$</span> whoami</div>
			<h1 class="text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
				Simple tools for managing your <span class="text-sky">music libraries</span>.<span
					aria-hidden="true"
					class="animate-blink bg-sky ml-2 inline-block h-[0.8em] w-2 align-middle"
				></span>
			</h1>
			<div class="mt-2"><span class="text-sky">$</span> cat about.txt</div>
			<p class="text-sand text-sm leading-relaxed sm:text-base">
				open source tooling around music library management, playback metadata, and personal music
				workflows.
			</p>
			<div class="mt-3"><span class="text-sky">$</span> ls libraries/</div>
			<div class="mt-1 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
				<a
					class="border-sand bg-sand text-obsidian hover:shadow-sky-offset inline-block rounded-[var(--radius-ui)] border-2 px-5 py-3 text-sm lowercase transition hover:-translate-x-0.5 hover:-translate-y-0.5"
					href={links.product}>open spotify-effect →</a
				>
				<span
					class="border-sand/50 text-sand/70 inline-block cursor-not-allowed rounded-[var(--radius-ui)] border-2 border-dashed px-5 py-3 text-sm lowercase select-none"
					aria-disabled="true">tidal-effect — brewing</span
				>
			</div>
		</div>
	</section>
</div>
