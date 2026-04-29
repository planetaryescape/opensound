import { docsDomain, frontpageDomain } from "./dns";

export const frontpage = new sst.cloudflare.StaticSiteV2("frontpage", {
  path: "./packages/frontpage",
  build: {
    command: "bun run build",
    output: "build",
  },
  domain: frontpageDomain,
});

export const docs = new sst.cloudflare.StaticSiteV2("docs", {
  path: "./packages/docs",
  build: {
    command: "bun run build",
    output: "dist",
  },
  domain: docsDomain,
  notFound: "404",
});

export const outputs = {
  frontpage: frontpage.url,
  docs: docs.url,
};
