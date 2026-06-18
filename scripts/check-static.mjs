import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "styles.css",
  "src/app.js",
  "src/game.js"
];

for (const file of requiredFiles) {
  await access(new URL(`../${file}`, import.meta.url));
}

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
for (const asset of ["./styles.css", "./src/app.js"]) {
  if (!html.includes(asset)) {
    throw new Error(`index.html 缺少资源引用：${asset}`);
  }
}

console.log("静态资源检查通过");
