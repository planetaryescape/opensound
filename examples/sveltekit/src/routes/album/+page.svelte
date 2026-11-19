<script lang="ts">
	import { untrack } from 'svelte';
	import { session } from '$lib/session.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { JsonObject } from './album-helpers';
	import AlbumGrid from './AlbumGrid.svelte';

	const PAGE_SIZE = 20;

	function getPageFromUrl(): number {
		const p = parseInt(page.url.searchParams.get('page') ?? '', 10);
		return Number.isFinite(p) && p >= 1 ? p : 1;
	}

	let searchQuery = $state('');
	let searchResults = $state<JsonObject[] | null>(null);
	let libraryAlbums = $state<JsonObject[] | null>(null);
	let addedAtMap = $state<Record<string, string>>({});
	let savedMap = $state<Record<string, boolean>>({});
	let libraryTotal = $state(0);
	let libraryOffset = $state((getPageFromUrl() - 1) * PAGE_SIZE);
	let isLoadingLibrary = $state(false);
	let isLoadingSearch = $state(false);
	let error = $state<string | null>(null);

	const libraryPage = $derived(Math.floor(libraryOffset / PAGE_SIZE) + 1);
	const libraryTotalPages = $derived(Math.max(1, Math.ceil(libraryTotal / PAGE_SIZE)));
	const hasNextPage = $derived(libraryOffset + PAGE_SIZE < libraryTotal);
	const hasPrevPage = $derived(libraryOffset > 0);

	const displayAlbums = $derived(
		searchQuery.trim() && searchResults ? searchResults : libraryAlbums ?? []
	);
	const gridLabel = $derived(searchQuery.trim() && searchResults ? 'search results' : 'your library');
	const isGridLoading = $derived(searchQuery.trim() ? isLoadingSearch : isLoadingLibrary);
	const skeletonCount = $derived(
		libraryAlbums ? Math.min(libraryAlbums.length || PAGE_SIZE, PAGE_SIZE) : PAGE_SIZE
	);

	async function checkSaved(albumIds: string[]) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken || albumIds.length === 0) return;

		try {
			const response = await fetch('/api/album/check-saved', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, albumIds })
			});
			if (!response.ok) return;
			const data = await response.json();
			savedMap = { ...savedMap, ...(data as Record<string, boolean>) };
		} catch {
			// silent
		}
	}

	async function fetchLibrary(offset = 0) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) return;

		isLoadingLibrary = true;
		error = null;
		try {
			const response = await fetch('/api/library', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, limit: PAGE_SIZE, offset })
			});
			const data: unknown = await response.json();
			if (!response.ok || typeof data !== 'object' || data === null) {
				throw new Error(JSON.stringify(data));
			}
			const d = data as JsonObject;
			const albumsPage = d.albums as JsonObject | undefined;
			const items = (albumsPage?.items as Array<JsonObject>) ?? [];

			const newAddedAt: Record<string, string> = {};
			const albums: JsonObject[] = [];
			for (const item of items) {
				const album = item.album;
				if (typeof album === 'object' && album !== null) {
					const a = album as JsonObject;
					albums.push(a);
					const id = a.id as string;
					const addedAt = item.added_at as string | undefined;
					if (id && addedAt) newAddedAt[id] = addedAt;
				}
			}

			libraryAlbums = albums;
			addedAtMap = { ...addedAtMap, ...newAddedAt };
			libraryTotal = (albumsPage?.total as number) ?? 0;
			libraryOffset = offset;

			const ids = albums.map((a) => a.id as string).filter(Boolean);
			const newSaved: Record<string, boolean> = {};
			for (const id of ids) newSaved[id] = true;
			savedMap = { ...savedMap, ...newSaved };
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoadingLibrary = false;
		}
	}

	function goToPage(direction: 'next' | 'prev') {
		const newOffset = direction === 'next'
			? libraryOffset + PAGE_SIZE
			: Math.max(0, libraryOffset - PAGE_SIZE);
		const newPage = Math.floor(newOffset / PAGE_SIZE) + 1;
		const url = new URL(page.url.href);
		if (newPage <= 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(newPage));
		}
		goto(url.toString(), { replace: false, reset: false });
	}

	async function performSearch(query: string) {
		const accessToken = session.tokens?.accessToken;
		if (!accessToken) return;

		isLoadingSearch = true;
		error = null;
		try {
			const response = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, query, types: ['album'] })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message ?? JSON.stringify(data));
			const albums = (data as JsonObject).albums as JsonObject | undefined;
			const items = ((albums?.items as Array<JsonObject>) ?? []);
			searchResults = items;

			const ids = items.map((a) => a.id as string).filter(Boolean);
			if (ids.length > 0) checkSaved(ids);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isLoadingSearch = false;
		}
	}

	$effect(() => {
		const urlPage = getPageFromUrl();
		const urlOffset = (urlPage - 1) * PAGE_SIZE;
		untrack(() => {
			if (urlOffset !== libraryOffset) {
				libraryOffset = urlOffset;
				if (session.tokens?.accessToken) {
					fetchLibrary(urlOffset);
				}
			}
		});
	});

	$effect(() => {
		const loggedIn = session.isLoggedIn;
		untrack(() => {
			if (loggedIn && !libraryAlbums && !isLoadingLibrary) {
				fetchLibrary(libraryOffset);
			}
		});
	});

	$effect(() => {
		const q = searchQuery.trim();
		if (!q) {
			searchResults = null;
			return;
		}
		const timer = setTimeout(() => performSearch(q), 400);
		return () => clearTimeout(timer);
	});
</script>

<div class="stack" style="gap: 20px">
	<div>
		<div class="section-header">albums</div>
		<div class="card stack">
			{#if !session.isLoggedIn}
				<div style="color: var(--warn); font-size: 12px">
					⚠ not logged in — log in on the home page first
				</div>
			{/if}

			<div class="field">
				<label class="field-label" for="album-search">search albums</label>
				<input
					id="album-search"
					type="text"
					bind:value={searchQuery}
					placeholder="search by name, artist..."
					disabled={!session.isLoggedIn}
				/>
			</div>

			{#if isLoadingSearch}
				<div style="font-size: 11px; color: var(--muted)">
					<span class="spinner" style="width: 12px; height: 12px"></span>
					searching…
				</div>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="error-box">{error}</div>
	{/if}

	<div>
		<div class="section-header">{gridLabel}</div>
		<AlbumGrid
			albums={displayAlbums}
			{savedMap}
			{addedAtMap}
			loading={isGridLoading}
			{skeletonCount}
		/>

		{#if !isGridLoading && displayAlbums.length === 0 && session.isLoggedIn}
			<div class="card" style="text-align: center; padding: 40px; color: var(--muted); font-size: 13px">
				{searchQuery.trim() ? 'no albums found' : 'no saved albums'}
			</div>
		{/if}

		{#if !searchQuery.trim() && libraryTotal > 0}
			<div class="pagination">
				<button class="ghost" onclick={() => goToPage('prev')} disabled={!hasPrevPage}>← prev</button>
				<span class="pagination-info">
					{libraryOffset + 1}–{Math.min(libraryOffset + PAGE_SIZE, libraryTotal)} of {libraryTotal}
					<span class="pagination-page">page {libraryPage}/{libraryTotalPages}</span>
				</span>
				<button class="ghost" onclick={() => goToPage('next')} disabled={!hasNextPage}>next →</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 12px 0;
	}

	.pagination-info {
		font-size: 12px;
		color: var(--muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.pagination-page {
		font-size: 11px;
		opacity: 0.7;
	}

	.pagination button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
