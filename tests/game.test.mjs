import test from "node:test";
import assert from "node:assert/strict";
import {
  cellAt,
  createGame,
  key,
  legalMoves,
  moveSelected,
  selectPiece,
  visiblePieceLabel
} from "../src/game.js";

test("当前玩家只能选择己方可移动棋子", () => {
  const game = createGame();
  const redEngineer = Object.values(game.pieces).find((piece) => piece.team === "red" && piece.type === "engineer");
  const bluePiece = Object.values(game.pieces).find((piece) => piece.team === "blue");
  const redFlag = Object.values(game.pieces).find((piece) => piece.team === "red" && piece.type === "flag");

  assert.equal(selectPiece(game, bluePiece.id), false);
  assert.equal(selectPiece(game, redFlag.id), false);
  assert.equal(selectPiece(game, redEngineer.id), true);
});

test("暗棋只对当前方展示己方，交战后可展示结果", () => {
  const game = createGame();
  const bluePiece = Object.values(game.pieces).find((piece) => piece.team === "blue");
  assert.equal(visiblePieceLabel(game, "red", bluePiece), "暗棋");
  bluePiece.revealed = true;
  assert.notEqual(visiblePieceLabel(game, "red", bluePiece), "暗棋");
});

test("地雷和军旗不可移动", () => {
  const game = createGame();
  const redMine = Object.values(game.pieces).find((piece) => piece.team === "red" && piece.type === "mine");
  const redFlag = Object.values(game.pieces).find((piece) => piece.team === "red" && piece.type === "flag");

  assert.deepEqual(legalMoves(game, redMine.id), []);
  assert.deepEqual(legalMoves(game, redFlag.id), []);
});

test("工兵可沿铁路连续移动", () => {
  const game = emptyGame();
  game.currentTeam = "red";
  game.pieces.e1 = { id: "e1", team: "red", type: "engineer", row: 7, col: 7, revealed: false };
  cellAt(game, 7, 7).pieceId = "e1";

  const moves = legalMoves(game, "e1").map((move) => key(move.row, move.col));
  assert.ok(moves.includes("7,14"));
  assert.ok(moves.includes("0,7"));
});

test("炸弹交战双方同时移除", () => {
  const game = emptyGame();
  game.currentTeam = "red";
  place(game, { id: "b1", team: "red", type: "bomb", row: 7, col: 7 });
  place(game, { id: "g1", team: "blue", type: "general", row: 7, col: 8 });
  selectPiece(game, "b1");

  const result = moveSelected(game, 7, 8);
  assert.equal(result.ok, true);
  assert.equal(game.pieces.b1, undefined);
  assert.equal(game.pieces.g1, undefined);
  assert.equal(cellAt(game, 7, 8).pieceId, null);
});

test("工兵可排雷，非工兵触雷阵亡", () => {
  const game = emptyGame();
  game.currentTeam = "red";
  place(game, { id: "e1", team: "red", type: "engineer", row: 7, col: 7 });
  place(game, { id: "m1", team: "blue", type: "mine", row: 7, col: 8 });
  selectPiece(game, "e1");
  moveSelected(game, 7, 8);
  assert.equal(game.pieces.e1.row, 7);
  assert.equal(game.pieces.e1.col, 8);
  assert.equal(game.pieces.m1, undefined);

  game.currentTeam = "green";
  place(game, { id: "r1", team: "green", type: "regiment", row: 7, col: 9 });
  place(game, { id: "m2", team: "yellow", type: "mine", row: 7, col: 10 });
  selectPiece(game, "r1");
  moveSelected(game, 7, 10);
  assert.equal(game.pieces.r1, undefined);
  assert.ok(game.pieces.m2);
});

test("夺旗会使阵营出局", () => {
  const game = emptyGame();
  game.currentTeam = "red";
  place(game, { id: "g1", team: "red", type: "general", row: 7, col: 7 });
  place(game, { id: "f1", team: "blue", type: "flag", row: 7, col: 8 });
  selectPiece(game, "g1");
  moveSelected(game, 7, 8);

  assert.equal(game.activeTeams.includes("blue"), false);
  assert.equal(game.pieces.g1.row, 7);
  assert.equal(game.pieces.g1.col, 8);
});

function emptyGame() {
  const game = createGame();
  for (const piece of Object.values(game.pieces)) {
    cellAt(game, piece.row, piece.col).pieceId = null;
  }
  game.pieces = {};
  game.selectedId = null;
  game.log = [];
  game.winner = null;
  game.activeTeams = ["red", "blue", "green", "yellow"];
  return game;
}

function place(game, piece) {
  game.pieces[piece.id] = { revealed: false, ...piece };
  cellAt(game, piece.row, piece.col).pieceId = piece.id;
}
