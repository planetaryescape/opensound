/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "opensound",
      stage: "live",
      removal: "remove",
      home: "cloudflare",
      providers: {
        cloudflare: "6.13.0",
      },
    };
  },
  async run() {
    const outputs: Record<string, string | undefined> = {};
    const { readdirSync } = await import("node:fs");

    for (const value of readdirSync("./infra/")) {
      const result = await import(`./infra/${value}`);

      if (result.outputs) {
        Object.assign(outputs, result.outputs);
      }
    }

    return outputs;
  },
});
