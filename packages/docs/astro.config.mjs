import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

export default defineConfig({
  site: "https://spotify.opensound.dev",
  base: "/",
  integrations: [
    starlight({
      title: "spotify-effect",
      description: "Effect-native Spotify Web API client",
      disable404Route: true,
      head: [],
      customCss: ["./src/styles/theme.css"],
      social: {
        github: "https://github.com/guidefari/spotify-effect",
      },
      components: {
        SiteTitle: "./src/components/SiteTitle.astro",
      },
      plugins: [
        starlightTypeDoc({
          entryPoints: [
            "../../packages/spotify-effect/src/index.ts",
            "../../packages/browser/src/index.ts",
            "../../packages/otel-node/src/index.ts",
          ],
          tsconfig: "./tsconfig.typedoc.json",
          output: "api",
          typeDoc: {
            entryPointStrategy: "resolve",
          },
          sidebar: {
            label: "API Reference",
            collapsed: true,
          },
        }),
      ],
      sidebar: [
        {
          label: "Guides",
          items: [
            { label: "Getting Started", link: "/guides/getting-started/" },
            { label: "Authentication", link: "/guides/authentication/" },
            { label: "Browser (PKCE)", link: "/guides/browser/" },
            { label: "Error Handling", link: "/guides/error-handling/" },
            { label: "Pagination", link: "/guides/pagination/" },
            { label: "Stream Pagination with SSE", link: "/guides/stream-pagination/" },
            { label: "Observability", link: "/guides/observability/" },
          ],
        },
        {
          label: "Services",
          items: [
            { label: "Albums", link: "/services/albums/" },
            { label: "Artists", link: "/services/artists/" },
            { label: "Browse", link: "/services/browse/" },
            { label: "Follow", link: "/services/follow/" },
            { label: "Library", link: "/services/library/" },
            { label: "Markets", link: "/services/markets/" },
            { label: "Player", link: "/services/player/" },
            { label: "Personalization", link: "/services/personalization/" },
            { label: "Playlists", link: "/services/playlists/" },
            { label: "Search", link: "/services/search/" },
            { label: "Tracks", link: "/services/tracks/" },
            { label: "Users", link: "/services/users/" },
          ],
        },
        typeDocSidebarGroup,
      ],
    }),
  ],
});
