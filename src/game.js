export const TEAMS = [
  { id: "red", name: "红方", color: "#c83f31" },
  { id: "blue", name: "蓝方", color: "#2f63b7" },
  { id: "green", name: "绿方", color: "#2f8a57" },
  { id: "yellow", name: "黄方", color: "#b88919" }
];

export const PIECES = {
  marshal: { name: "司令", rank: 12, movable: true },
  general: { name: "军长", rank: 11, movable: true },
  division: { name: "师长", rank: 10, movable: true },
  brigade: { name: "旅长", rank: 9, movable: true },
  regiment: { name: "团长", rank: 8, movable: true },
  battalion: { name: "营长", rank: 7, movable: true },
  company: { name: "连长", rank: 6, movable: true },
  platoon: { name: "排长", rank: 5, movable: true },
  engineer: { name: "工兵", rank: 4, movable: true, engineer: true },
  bomb: { name: "炸弹", rank: 0, movable: true, bomb: true },
  mine: { name: "地雷", rank: 13, movable: false, mine: true },
  flag: { name: "军旗", rank: -1, movable: false, flag: true }
};

const BOARD_SIZE = 15;
const CAMP_POINTS = new Set([
  "6,6", "6,8", "8,6", "8,8",
  "11,6", "11,8", "13,6", "13,8",
  "6,1", "6,3", "8,1", "8,3",
  "1,6", "1,8", "3,6", "3,8",
  "6,11", "6,13", "8,11", "8,13"
]);
const BASE_POINTS = new Set(["14,7", "7,4", "0,7", "7,10"]);
const RAIL_POINTS = new Set();

for (let i = 0; i < BOARD_SIZE; i += 1) {
  RAIL_POINTS.add(`7,${i}`);
  RAIL_POINTS.add(`${i},7`);
}
for (let i = 5; i <= 9; i += 1) {
  RAIL_POINTS.add(`5,${i}`);
  RAIL_POINTS.add(`9,${i}`);
  RAIL_POINTS.add(`${i},5`);
  RAIL_POINTS.add(`${i},9`);
}

const TEAM_AREAS = {
  red: { rows: [10, 14], cols: [5, 9] },
  blue: { rows: [5, 9], cols: [0, 4] },
  green: { rows: [0, 4], cols: [5, 9] },
  yellow: { rows: [5, 9], cols: [10, 14] }
};

const PRESETS = {
  red: [
    ["mine", "engineer", "platoon", "engineer", "mine"],
    ["company", "camp", "battalion", "camp", "company"],
    ["regiment", "bomb", "brigade", "bomb", "division"],
    ["engineer", "camp", "general", "camp", "marshal"],
    ["mine", "platoon", "flag", "regiment", "mine"]
  ],
  blue: [
    ["mine", "company", "regiment", "engineer", "mine"],
    ["engineer", "camp", "bomb", "camp", "platoon"],
    ["platoon", "battalion", "brigade", "general", "flag"],
    ["engineer", "camp", "bomb", "camp", "division"],
    ["mine", "company", "regiment", "marshal", "mine"]
  ],
  green: [
    ["mine", "regiment", "flag", "platoon", "mine"],
    ["marshal", "camp", "general", "camp", "engineer"],
    ["division", "bomb", "brigade", "bomb", "regiment"],
    ["company", "camp", "battalion", "camp", "company"],
    ["mine", "engineer", "platoon", "engineer", "mine"]
  ],
  yellow: [
    ["mine", "marshal", "regiment", "company", "mine"],
    ["division", "camp", "bomb", "camp", "engineer"],
    ["flag", "general", "brigade", "battalion", "platoon"],
    ["platoon", "camp", "bomb", "camp", "engineer"],
    ["mine", "engineer", "regiment", "company", "mine"]
  ]
};

export function createGame() {
  const cells = createBoard();
  const pieces = {};
  let nextPieceId = 1;

  for (const team of TEAMS) {
    const area = TEAM_AREAS[team.id];
    const layout = PRESETS[team.id];
    for (let row = area.rows[0]; row <= area.rows[1]; row += 1) {
      for (let col = area.cols[0]; col <= area.cols[1]; col += 1) {
        const type = layout[row - area.rows[0]][col - area.cols[0]];
        if (type === "camp") continue;
        const id = `p${nextPieceId}`;
        nextPieceId += 1;
        pieces[id] = { id, team: team.id, type, row, col, revealed: false };
        cells[key(row, col)].pieceId = id;
      }
    }
  }

  return {
    cells,
    pieces,
    currentTeam: "red",
    selectedId: null,
    activeTeams: TEAMS.map((team) => team.id),
    log: ["红方先手，选择己方棋子开始。"],
    winner: null
  };
}

export function createBoard() {
  const cells = {};
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!isPlayable(row, col)) continue;
      cells[key(row, col)] = {
        row,
        col,
        kind: BASE_POINTS.has(key(row, col)) ? "base" : CAMP_POINTS.has(key(row, col)) ? "camp" : "road",
        rail: RAIL_POINTS.has(key(row, col)),
        teamZone: teamZoneFor(row, col),
        pieceId: null
      };
    }
  }
  return cells;
}

export function selectPiece(game, pieceId) {
  const piece = game.pieces[pieceId];
  if (!piece || game.winner || !game.activeTeams.includes(piece.team)) return false;
  if (piece.team !== game.currentTeam) return false;
  if (!PIECES[piece.type].movable) return false;
  game.selectedId = pieceId;
  return true;
}

export function legalMoves(game, pieceId) {
  const piece = game.pieces[pieceId];
  if (!piece || piece.team !== game.currentTeam || game.winner) return [];
  const meta = PIECES[piece.type];
  if (!meta.movable) return [];

  const moves = new Map();
  for (const target of adjacentCells(game, piece.row, piece.col)) {
    addIfLegalTarget(game, piece, target, moves);
  }

  if (meta.engineer && cellAt(game, piece.row, piece.col)?.rail) {
    for (const target of railMoves(game, piece)) {
      addIfLegalTarget(game, piece, target, moves);
    }
  }

  return [...moves.values()];
}

export function moveSelected(game, row, col) {
  if (!game.selectedId) return { ok: false, reason: "未选中棋子" };
  const allowed = legalMoves(game, game.selectedId);
  if (!allowed.some((move) => move.row === row && move.col === col)) {
    return { ok: false, reason: "不是合法移动" };
  }

  const attacker = game.pieces[game.selectedId];
  const targetCell = cellAt(game, row, col);
  const defender = targetCell.pieceId ? game.pieces[targetCell.pieceId] : null;
  let message;

  if (!defender) {
    movePiece(game, attacker, row, col);
    message = `${teamName(attacker.team)} ${pieceName(attacker)} 移动到 ${coord(row, col)}`;
  } else {
    message = resolveBattle(game, attacker, defender);
  }

  game.log.unshift(message);
  game.selectedId = null;
  updateWinner(game);
  if (!game.winner) advanceTurn(game);
  return { ok: true, message };
}

export function visiblePieceLabel(game, viewerTeam, piece) {
  if (!piece) return "";
  if (piece.team === viewerTeam || piece.revealed) return PIECES[piece.type].name;
  return "暗棋";
}

export function teamName(teamId) {
  return TEAMS.find((team) => team.id === teamId)?.name ?? teamId;
}

export function pieceName(piece) {
  return PIECES[piece.type].name;
}

export function key(row, col) {
  return `${row},${col}`;
}

export function cellAt(game, row, col) {
  return game.cells[key(row, col)] ?? null;
}

function resolveBattle(game, attacker, defender) {
  attacker.revealed = true;
  defender.revealed = true;
  const attackerName = `${teamName(attacker.team)} ${pieceName(attacker)}`;
  const defenderName = `${teamName(defender.team)} ${pieceName(defender)}`;
  const row = defender.row;
  const col = defender.col;

  if (PIECES[attacker.type].bomb || PIECES[defender.type].bomb) {
    removePiece(game, attacker);
    removePiece(game, defender);
    return `${attackerName} 与 ${defenderName} 同归于尽`;
  }

  if (PIECES[defender.type].mine) {
    if (PIECES[attacker.type].engineer) {
      removePiece(game, defender);
      movePiece(game, attacker, row, col);
      return `${attackerName} 排除 ${defenderName}`;
    }
    removePiece(game, attacker);
    return `${attackerName} 触雷阵亡，${defenderName} 留守`;
  }

  if (PIECES[defender.type].flag) {
    removePiece(game, defender);
    movePiece(game, attacker, row, col);
    eliminateTeam(game, defender.team);
    return `${attackerName} 夺取 ${defenderName}，${teamName(defender.team)} 出局`;
  }

  const attackRank = PIECES[attacker.type].rank;
  const defendRank = PIECES[defender.type].rank;
  if (attackRank > defendRank) {
    removePiece(game, defender);
    movePiece(game, attacker, row, col);
    return `${attackerName} 击败 ${defenderName}`;
  }
  if (attackRank < defendRank) {
    removePiece(game, attacker);
    return `${attackerName} 败给 ${defenderName}`;
  }

  removePiece(game, attacker);
  removePiece(game, defender);
  return `${attackerName} 与 ${defenderName} 同级俱灭`;
}

function movePiece(game, piece, row, col) {
  const from = cellAt(game, piece.row, piece.col);
  const to = cellAt(game, row, col);
  if (from) from.pieceId = null;
  to.pieceId = piece.id;
  piece.row = row;
  piece.col = col;
}

function removePiece(game, piece) {
  const cell = cellAt(game, piece.row, piece.col);
  if (cell?.pieceId === piece.id) cell.pieceId = null;
  delete game.pieces[piece.id];
}

function eliminateTeam(game, teamId) {
  game.activeTeams = game.activeTeams.filter((id) => id !== teamId);
  for (const piece of Object.values(game.pieces)) {
    if (piece.team === teamId) {
      const cell = cellAt(game, piece.row, piece.col);
      if (cell?.pieceId === piece.id) cell.pieceId = null;
      delete game.pieces[piece.id];
    }
  }
}

function updateWinner(game) {
  if (game.activeTeams.length === 1) {
    game.winner = game.activeTeams[0];
    game.log.unshift(`${teamName(game.winner)} 获胜`);
  }
}

function advanceTurn(game) {
  const currentIndex = TEAMS.findIndex((team) => team.id === game.currentTeam);
  for (let offset = 1; offset <= TEAMS.length; offset += 1) {
    const next = TEAMS[(currentIndex + offset) % TEAMS.length].id;
    if (game.activeTeams.includes(next)) {
      game.currentTeam = next;
      return;
    }
  }
}

function addIfLegalTarget(game, piece, target, moves) {
  const occupant = target.pieceId ? game.pieces[target.pieceId] : null;
  if (occupant?.team === piece.team) return;
  moves.set(key(target.row, target.col), { row: target.row, col: target.col });
}

function adjacentCells(game, row, col) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ].map(([r, c]) => cellAt(game, r, c)).filter(Boolean);
}

function railMoves(game, piece) {
  const found = [];
  const queue = adjacentCells(game, piece.row, piece.col).filter((cell) => cell.rail);
  const seen = new Set([key(piece.row, piece.col)]);

  while (queue.length > 0) {
    const cell = queue.shift();
    const cellKey = key(cell.row, cell.col);
    if (seen.has(cellKey)) continue;
    seen.add(cellKey);
    const occupant = cell.pieceId ? game.pieces[cell.pieceId] : null;
    if (!occupant) {
      found.push(cell);
      queue.push(...adjacentCells(game, cell.row, cell.col).filter((next) => next.rail));
    } else if (occupant.team !== piece.team) {
      found.push(cell);
    }
  }

  return found;
}

function isPlayable(row, col) {
  if (row >= 5 && row <= 9) return true;
  if (col >= 5 && col <= 9) return true;
  return false;
}

function teamZoneFor(row, col) {
  for (const [teamId, area] of Object.entries(TEAM_AREAS)) {
    if (row >= area.rows[0] && row <= area.rows[1] && col >= area.cols[0] && col <= area.cols[1]) {
      return teamId;
    }
  }
  return null;
}

function coord(row, col) {
  return `${row + 1}-${col + 1}`;
}
