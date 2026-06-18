import { mkdir, readFile, writeFile } from "node:fs/promises";

const gameSource = await readFile(new URL("../src/game.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

const browserGame = gameSource
  .replaceAll("export const ", "const ")
  .replaceAll("export function ", "function ");

const browserApp = appSource.replace(/^import[\s\S]+?from "\.\/game\.js";\n\n/, "");

const bundle = `(() => {
"use strict";

${browserGame}

${browserApp}
})();
`;

await mkdir(new URL("../dist", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/app.bundle.js", import.meta.url), bundle);
console.log("浏览器脚本构建完成：dist/app.bundle.js");
