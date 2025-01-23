import {
  Coord,
  Ships,
  ShipState,
  ledger,
  Ledger,
  SHOT_RESULT,
  GAME_STATE,
  Witnesses,
  Contract as ContractType,
} from './managed/battleship_east/contract/index.cjs';
import { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export { SHOT_RESULT };
export { GAME_STATE };
export type { Ships, Coord, Witnesses, Ledger, ShipState };
export { ledger };
export { ContractType };
export type Contract<T, W extends Witnesses<T> = Witnesses<T>> = ContractType<T, W>;
export const Contract = ContractType;

function ship2Cells(cell: Coord, vertical: boolean): [Coord, Coord] {
  if (vertical) {
    return [cell, { x: cell.x, y: cell.y + 1n }];
  } else {
    return [cell, { x: cell.x + 1n, y: cell.y }];
  }
}

function ship3Cells(cell: Coord, vertical: boolean): [Coord, Coord, Coord] {
  if (vertical) {
    return [cell, { x: cell.x, y: cell.y + 1n }, { x: cell.x, y: cell.y + 2n }];
  } else {
    return [cell, { x: cell.x + 1n, y: cell.y }, { x: cell.x + 2n, y: cell.y }];
  }
}

function ship4Cells(cell: Coord, vertical: boolean): [Coord, Coord, Coord, Coord] {
  if (vertical) {
    return [cell, { x: cell.x, y: cell.y + 1n }, { x: cell.x, y: cell.y + 2n }, { x: cell.x, y: cell.y + 3n }];
  } else {
    return [cell, { x: cell.x + 1n, y: cell.y }, { x: cell.x + 2n, y: cell.y }, { x: cell.x + 3n, y: cell.y }];
  }
}

export function validateIntersection(coords: Coord[]): boolean {
  const seen = new Set<string>();

  for (const { x, y } of coords) {
    if (x < 1n || x > 10n || y < 1n || y > 10n) {
      return false; // Out of bounds
    }

    const key = `${x},${y}`;

    if (seen.has(key)) {
      return false; // Intersection found
    }

    seen.add(key);
  }

  return true;
}

export type BattleshipEastPrivateState = {
  readonly localSecretKey: Uint8Array;
  readonly playerShipPositions: Ships;
  readonly playerShipState?: ShipState;
};

export const eastWitnesses = {
  local_secret_key: ({
    privateState,
  }: WitnessContext<Ledger, BattleshipEastPrivateState>): [BattleshipEastPrivateState, Uint8Array] => [
    privateState,
    privateState.localSecretKey,
  ],
  player_ship_positions: ({
    privateState,
  }: WitnessContext<Ledger, BattleshipEastPrivateState>): [BattleshipEastPrivateState, Ships] => [
    privateState,
    privateState.playerShipPositions,
  ],
  player_ship_state: ({
    privateState,
  }: WitnessContext<Ledger, BattleshipEastPrivateState>): [BattleshipEastPrivateState, ShipState] => [
    privateState,
    privateState.playerShipState || {
      s11: { x: 0n, y: 0n },
      s12: { x: 0n, y: 0n },
      s13: { x: 0n, y: 0n },
      s14: { x: 0n, y: 0n },
      s21: [],
      s22: [],
      s23: [],
      s31: [],
      s32: [],
      s41: [],
    },
  ],
  set_player_ship_state: (
    { privateState }: WitnessContext<Ledger, BattleshipEastPrivateState>,
    playerShipState: ShipState,
  ): [BattleshipEastPrivateState, []] => [{ ...privateState, playerShipState }, []],
};

export function getEastOccupiedCells(ships: Ships): Coord[] {
  const occupiedCells: Coord[] = [];

  const addCells = (coords?: Coord, cellFunction?: () => Coord[]): void => {
    if (coords && cellFunction) {
      occupiedCells.push(...cellFunction());
    }
  };

  if (ships.s11) addCells(ships.s11, () => [ships.s11]);
  if (ships.s12) addCells(ships.s12, () => [ships.s12]);
  if (ships.s13) addCells(ships.s13, () => [ships.s13]);
  if (ships.s14) addCells(ships.s14, () => [ships.s14]);
  if (ships.s21) addCells(ships.s21, () => ship2Cells(ships.s21, ships.v21));
  if (ships.s22) addCells(ships.s22, () => ship2Cells(ships.s22, ships.v22));
  if (ships.s23) addCells(ships.s23, () => ship2Cells(ships.s23, ships.v23));
  if (ships.s31) addCells(ships.s31, () => ship3Cells(ships.s31, ships.v31));
  if (ships.s32) addCells(ships.s32, () => ship3Cells(ships.s32, ships.v32));
  if (ships.s41) addCells(ships.s41, () => ship4Cells(ships.s41, ships.v41));

  return occupiedCells;
}

function getShipOccupiedCells(coord: Coord, size: number, isVertical: boolean): Coord[] {
  const cells: Coord[] = [];
  for (let i = 0; i < size; i++) {
    cells.push(isVertical ? { x: coord.x, y: coord.y + BigInt(i) } : { x: coord.x + BigInt(i), y: coord.y });
  }
  return cells;
}

// Helper to calculate adjacent (buffer) cells
function getBufferCells(occupied: Coord[]): Coord[] {
  const buffer: Set<string> = new Set();

  const offsets = [-1n, 0n, 1n];
  for (const cell of occupied) {
    for (const dx of offsets) {
      for (const dy of offsets) {
        buffer.add(`${cell.x + dx},${cell.y + dy}`);
      }
    }
  }

  // Exclude original occupied cells from buffer
  occupied.forEach((cell) => buffer.delete(`${cell.x},${cell.y}`));

  return Array.from(buffer).map((cell) => {
    const [x, y] = cell.split(',').map(BigInt);
    return { x, y };
  });
}

// Validator
export function validateOverlap(shipInput: Ships): boolean {
  const occupiedCells = new Set<string>();
  const bufferCells = new Set<string>();

  // Define ship configurations (static structure)
  const ships = [
    { coord: shipInput.s11, size: 1, isVertical: false },
    { coord: shipInput.s12, size: 1, isVertical: false },
    { coord: shipInput.s13, size: 1, isVertical: false },
    { coord: shipInput.s14, size: 1, isVertical: false },
    { coord: shipInput.s21, size: 2, isVertical: shipInput.v21 },
    { coord: shipInput.s22, size: 2, isVertical: shipInput.v22 },
    { coord: shipInput.s23, size: 2, isVertical: shipInput.v23 },
    { coord: shipInput.s31, size: 3, isVertical: shipInput.v31 },
    { coord: shipInput.s32, size: 3, isVertical: shipInput.v32 },
    { coord: shipInput.s41, size: 4, isVertical: shipInput.v41 },
  ];

  for (const ship of ships) {
    if (!ship.coord) continue;

    const cells = getShipOccupiedCells(ship.coord, ship.size, ship.isVertical);
    const buffer = getBufferCells(cells);

    for (const cell of cells) {
      const serialized = `${cell.x},${cell.y}`;

      // Check if cell overlaps with another ship's occupied or buffer area
      if (occupiedCells.has(serialized) || bufferCells.has(serialized)) {
        return false;
      }

      occupiedCells.add(serialized);
    }

    // Add buffer cells to the buffer set
    for (const cell of buffer) {
      bufferCells.add(`${cell.x},${cell.y}`);
    }
  }

  return true; // All validations passed
}

export function validateShips(shipPositions: Ships): boolean {
  const noIntersection = validateIntersection(getEastOccupiedCells(shipPositions));
  const noOverlap = validateOverlap(shipPositions);
  return noIntersection && noOverlap;
}
