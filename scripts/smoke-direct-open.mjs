import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

class FakeClassList {
  constructor(element) {
    this.element = element;
    this.names = new Set();
  }

  add(...names) {
    for (const name of names) this.names.add(name);
    this.element.className = [...this.names].join(" ");
  }

  contains(name) {
    return this.names.has(name);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = {};
    this.className = "";
    this.classList = new FakeClassList(this);
    this.disabled = false;
    this.textContent = "";
    this.title = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  click() {
    this.listeners.get("click")?.();
  }

  set innerHTML(_value) {
    this.children = [];
    this.textContent = "";
  }
}

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.match(html, /<script src="\.\/dist\/app\.bundle\.js"><\/script>/);
assert.doesNotMatch(html, /type="module"/);

const elements = new Map([
  ["#board", new FakeElement("div")],
  ["#turnText", new FakeElement("p")],
  ["#selectionText", new FakeElement("p")],
  ["#battleLog", new FakeElement("ol")],
  ["#winnerText", new FakeElement("p")],
  ["#teams", new FakeElement("div")],
  ["#restartButton", new FakeElement("button")]
]);

const document = {
  createElement: (tagName) => new FakeElement(tagName),
  querySelector: (selector) => elements.get(selector) ?? null
};

const bundle = await readFile(new URL("../dist/app.bundle.js", import.meta.url), "utf8");
vm.runInNewContext(bundle, { document }, { filename: "dist/app.bundle.js" });

const board = elements.get("#board");
const activeCells = board.children.filter((cell) => cell.classList.contains("active"));
assert.equal(board.children.length, 225);
assert.ok(activeCells.length > 0);
assert.equal(elements.get("#turnText").textContent, "红方回合");

const selectableRedCell = activeCells.find((cell) =>
  cell.children.some((child) =>
    child.className.split(" ").includes("piece") &&
    child.className.split(" ").includes("red") &&
    !["地雷", "军旗"].includes(child.textContent)
  )
);
assert.ok(selectableRedCell);
selectableRedCell.click();
assert.match(elements.get("#selectionText").textContent, /^红方 .+，合法目标 \d+ 个$/);

console.log("直接打开入口 smoke 通过");
