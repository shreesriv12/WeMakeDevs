import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";

const output = "dist/quiz-worker";
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await build({
  entryPoints: ["workers/quiz/index.mjs"],
  outfile: `${output}/index.mjs`,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  sourcemap: true,
  minify: true,
  legalComments: "none",
});
console.log(`Quiz Lambda bundle written to ${output}/index.mjs`);
