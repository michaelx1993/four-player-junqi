import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "styles.css",
  "dist/app.bundle.js",
  "src/app.js",
  "src/game.js"
];

for (const file of requiredFiles) {
  await access(new URL(`../${file}`, import.meta.url));
}

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
for (const asset of ["./styles.css", "./dist/app.bundle.js"]) {
  if (!html.includes(asset)) {
    throw new Error(`index.html 缺少资源引用：${asset}`);
  }
}

if (html.includes("type=\"module\"")) {
  throw new Error("index.html 默认入口不能依赖 ES module，需支持 file:// 直接打开");
}

console.log("静态资源检查通过");
