import {
  TEAMS,
  PIECES,
  cellAt,
  createGame,
  key,
  legalMoves,
  moveSelected,
  pieceName,
  selectPiece,
  teamName,
  visiblePieceLabel
} from "./game.js";

let game = createGame();

const boardEl = document.querySelector("#board");
const turnText = document.querySelector("#turnText");
const selectionText = document.querySelector("#selectionText");
const battleLog = document.querySelector("#battleLog");
const winnerText = document.querySelector("#winnerText");
const teamsEl = document.querySelector("#teams");
const restartButton = document.querySelector("#restartButton");

restartButton.addEventListener("click", () => {
  game = createGame();
  render();
});

function render() {
  const selected = game.selectedId ? game.pieces[game.selectedId] : null;
  const legal = selected ? new Set(legalMoves(game, selected.id).map((move) => key(move.row, move.col))) : new Set();
  boardEl.innerHTML = "";

  for (let row = 0; row < 15; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      const cell = cellAt(game, row, col);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.style.gridRow = `${row + 1}`;
      button.style.gridColumn = `${col + 1}`;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `第 ${row + 1} 行第 ${col + 1} 列`);

      if (!cell) {
        button.disabled = true;
        boardEl.append(button);
        continue;
      }

      button.classList.add("active", cell.rail ? "rail" : "road");
      if (cell.kind === "camp") button.classList.add("camp");
      if (cell.kind === "base") button.classList.add("base");
      if (cell.teamZone) button.classList.add(`${cell.teamZone}-zone`);
      if (selected && selected.row === row && selected.col === col) button.classList.add("selected");
      if (legal.has(key(row, col))) {
        button.classList.add("legal");
        const marker = document.createElement("span");
        marker.className = "marker";
        marker.setAttribute("aria-hidden", "true");
        button.append(marker);
      }

      const label = cellLabel(cell);
      if (label) {
        const labelEl = document.createElement("span");
        labelEl.className = "label";
        labelEl.textContent = label;
        button.append(labelEl);
      }

      if (cell.pieceId) {
        const piece = game.pieces[cell.pieceId];
        button.append(renderPiece(piece));
      }

      button.addEventListener("click", () => handleCellClick(row, col));
      boardEl.append(button);
    }
  }

  renderPanels();
}

function handleCellClick(row, col) {
  if (game.winner) return;
  const cell = cellAt(game, row, col);
  if (!cell) return;
  const piece = cell.pieceId ? game.pieces[cell.pieceId] : null;

  if (game.selectedId) {
    const result = moveSelected(game, row, col);
    if (!result.ok && piece?.team === game.currentTeam) {
      selectPiece(game, piece.id);
    }
    render();
    return;
  }

  if (piece) {
    selectPiece(game, piece.id);
    render();
  }
}

function renderPiece(piece) {
  const pieceEl = document.createElement("span");
  const visible = piece.team === game.currentTeam || piece.revealed;
  pieceEl.className = `piece ${piece.team}${visible ? "" : " hidden"}`;
  pieceEl.textContent = visiblePieceLabel(game, game.currentTeam, piece);
  pieceEl.title = visible ? `${teamName(piece.team)} ${pieceName(piece)}` : `${teamName(piece.team)} 暗棋`;
  return pieceEl;
}

function renderPanels() {
  turnText.textContent = game.winner ? `${teamName(game.winner)} 获胜` : `${teamName(game.currentTeam)}回合`;
  const selected = game.selectedId ? game.pieces[game.selectedId] : null;
  selectionText.textContent = selected
    ? `${teamName(selected.team)} ${pieceName(selected)}，合法目标 ${legalMoves(game, selected.id).length} 个`
    : "未选中棋子";
  winnerText.textContent = game.winner ? `${teamName(game.winner)} 获胜，对局结束` : "对局进行中";

  teamsEl.innerHTML = "";
  for (const team of TEAMS) {
    const row = document.createElement("div");
    row.className = "team-row";
    const status = game.activeTeams.includes(team.id) ? (game.currentTeam === team.id ? "行动中" : "存活") : "出局";
    row.innerHTML = `
      <span class="team-name"><span class="team-dot" style="background:${team.color}"></span>${team.name}</span>
      <span>${status}</span>
    `;
    teamsEl.append(row);
  }

  battleLog.innerHTML = "";
  for (const entry of game.log.slice(0, 8)) {
    const item = document.createElement("li");
    item.textContent = entry;
    battleLog.append(item);
  }
}

function cellLabel(cell) {
  if (cell.kind === "base") return "营";
  if (cell.kind === "camp") return "行";
  if (cell.rail) return "铁";
  return "";
}

render();
