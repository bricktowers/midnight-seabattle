import { type BattleshipDerivedState, BOARD_STATE, type LastShotResult } from './common-types.js';
import {
  type Coord,
  GAME_STATE,
  getOccupiedCells,
  type PartialShips,
  SHIP,
  SHOT_RESULT,
} from '@bricktowers/battleship-west-contract';

export const prettyPrintCell = (cell: BOARD_STATE): string => {
  switch (cell) {
    case BOARD_STATE.empty:
      return ' ';
    case BOARD_STATE.ship:
      return 'S';
    case BOARD_STATE.ship_sunk:
      return 'X';
    case BOARD_STATE.ship_hit:
      return 'I';
    case BOARD_STATE.attempt:
      return '?';
    case BOARD_STATE.miss:
      return 'O';
    default:
      return '?';
  }
};

export const prettyPrintBoard = (board: BOARD_STATE[][]): string => {
  // Top border
  const topBorder = `+${'-'.repeat(board[0].length * 3 - 1)}+`;
  // Rows with vertical labels
  const rows = board.map((row, rowIndex) => `| ${row.map((cell) => prettyPrintCell(cell)).join('  ')} |`).join('\n');
  // Bottom border
  const bottomBorder = `+${'-'.repeat(board[0].length * 3 - 1)}+`;
  // Combine all parts
  return `\n${topBorder}\n${rows}\n${bottomBorder}`;
};

export const updateCell = (
  partialShips: PartialShips,
  myShips: Coord[],
  value: BattleshipDerivedState,
  playerValue: string,
  board: 'p1' | 'p2',
  cell: BOARD_STATE,
  col: bigint,
  row: bigint,
): BOARD_STATE => {
  const isMyPlayer: boolean = value.whoami === playerValue;

  if (isMyPlayer && cell === BOARD_STATE.empty && myShips.some((ship) => ship.x === col && ship.y === row)) {
    return BOARD_STATE.ship;
  }

  if (getOccupiedCells(partialShips).some((ship) => ship.x === col && ship.y === row)) {
    return BOARD_STATE.ship_sunk;
  }

  if (value.lastShotResult !== undefined) {
    const lastShotResult: LastShotResult = value.lastShotResult;
    if (lastShotResult.player === playerValue && lastShotResult.cell.x === col && lastShotResult.cell.y === row) {
      if (lastShotResult.result === SHOT_RESULT.ship_sunk) return BOARD_STATE.ship_sunk;
      else if (lastShotResult.result === SHOT_RESULT.ship_hit) return BOARD_STATE.ship_hit;
      else return BOARD_STATE.miss;
    }
  }

  if (
    value.shotAttempt.x > 0n &&
    ((board === 'p1' && value.state === GAME_STATE.p1_turn) ||
      (board === 'p2' && value.state === GAME_STATE.p2_turn)) &&
    value.shotAttempt.x === col &&
    value.shotAttempt.y === row
  ) {
    if (cell === BOARD_STATE.ship) {
      return BOARD_STATE.ship_hit;
    } else if (cell === BOARD_STATE.ship_hit) {
      return BOARD_STATE.ship_hit;
    } else return BOARD_STATE.attempt;
  }
  return cell;
};

export const updateBoard = (
  boardState: BOARD_STATE[][],
  partialShips: PartialShips,
  value: BattleshipDerivedState,
  playerValue: string,
  board: 'p1' | 'p2',
): BOARD_STATE[][] => {
  const myShips: Coord[] = value.privateShips !== undefined ? getOccupiedCells(value.privateShips) : [];
  return boardState?.map((row, y) =>
    row.map((cell, x) => {
      const col = BigInt(x + 1);
      const row = BigInt(y + 1);

      return updateCell(partialShips, myShips, value, playerValue, board, cell, col, row);
    }),
  );
};

export const updatePartialShips = (
  partialShips: PartialShips,
  value: BattleshipDerivedState,
  board: 'p1' | 'p2',
): PartialShips => {
  if (value.lastShotResult === undefined) {
    return partialShips;
  }

  const isCorrectTurn =
    (board === 'p1' && value.state === GAME_STATE.p2_turn) ||
    (board === 'p2' && value.state === GAME_STATE.p1_turn) ||
    (board === 'p1' && value.state === GAME_STATE.p2_wins) ||
    (board === 'p2' && value.state === GAME_STATE.p1_wins);

  if (!isCorrectTurn) {
    return partialShips;
  }

  if (value.lastShotResult.ship_def.ship === SHIP.s21) {
    return {
      ...partialShips,
      s21: value.lastShotResult.ship_def.ship_cell,
      v21: value.lastShotResult.ship_def.ship_v,
    };
  } else if (value.lastShotResult.ship_def.ship === SHIP.s31) {
    return {
      ...partialShips,
      s31: value.lastShotResult.ship_def.ship_cell,
      v31: value.lastShotResult.ship_def.ship_v,
    };
  } else if (value.lastShotResult.ship_def.ship === SHIP.s32) {
    return {
      ...partialShips,
      s32: value.lastShotResult.ship_def.ship_cell,
      v32: value.lastShotResult.ship_def.ship_v,
    };
  } else if (value.lastShotResult.ship_def.ship === SHIP.s41) {
    return {
      ...partialShips,
      s41: value.lastShotResult.ship_def.ship_cell,
      v41: value.lastShotResult.ship_def.ship_v,
    };
  } else if (value.lastShotResult.ship_def.ship === SHIP.s51) {
    return {
      ...partialShips,
      s51: value.lastShotResult.ship_def.ship_cell,
      v51: value.lastShotResult.ship_def.ship_v,
    };
  } else {
    return partialShips;
  }
};
