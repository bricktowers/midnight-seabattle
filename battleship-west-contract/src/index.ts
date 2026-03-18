import { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Contract } from './managed/battleship_west/contract/index.js';
import type { Witnesses, Coord, Ledger, Ships, ShipState } from './managed/battleship_west/contract/index.js';

export * from './managed/battleship_west/contract/index.js';

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

function ship5Cells(cell: Coord, vertical: boolean): [Coord, Coord, Coord, Coord, Coord] {
  if (vertical) {
    return [
      cell,
      { x: cell.x, y: cell.y + 1n },
      { x: cell.x, y: cell.y + 2n },
      { x: cell.x, y: cell.y + 3n },
      { x: cell.x, y: cell.y + 4n },
    ];
  } else {
    return [
      cell,
      { x: cell.x + 1n, y: cell.y },
      { x: cell.x + 2n, y: cell.y },
      { x: cell.x + 3n, y: cell.y },
      { x: cell.x + 4n, y: cell.y },
    ];
  }
}

export type PartialShips = {
  s21?: Coord;
  s31?: Coord;
  s32?: Coord;
  s41?: Coord;
  s51?: Coord;
  v21: boolean;
  v31: boolean;
  v32: boolean;
  v41: boolean;
  v51: boolean;
};

export function getOccupiedCells(ships: PartialShips | Ships): Coord[] {
  const occupiedCells: Coord[] = [];

  const addCells = (coords?: Coord, cellFunction?: () => Coord[]): void => {
    if (coords && cellFunction) {
      occupiedCells.push(...cellFunction());
    }
  };

  if (ships.s21) addCells(ships.s21, () => ship2Cells(ships.s21 as Coord, ships.v21));
  if (ships.s31) addCells(ships.s31, () => ship3Cells(ships.s31 as Coord, ships.v31));
  if (ships.s32) addCells(ships.s32, () => ship3Cells(ships.s32 as Coord, ships.v32));
  if (ships.s41) addCells(ships.s41, () => ship4Cells(ships.s41 as Coord, ships.v41));
  if (ships.s51) addCells(ships.s51, () => ship5Cells(ships.s51 as Coord, ships.v51));

  return occupiedCells;
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

export function validateShips(partialShip: PartialShips | Ships): boolean {
  return validateIntersection(getOccupiedCells(partialShip));
}

export function convertPartialShips(partialShips: PartialShips): Ships | undefined {
  const { s21, s31, s32, s41, s51, v21, v31, v32, v41, v51 } = partialShips;

  if (s21 && s31 && s32 && s41 && s51) {
    return {
      s21,
      s31,
      s32,
      s41,
      s51,
      v21,
      v31,
      v32,
      v41,
      v51,
    };
  }
  return undefined;
}

export type BattleshipPrivateState = {
  readonly localSecretKey: Uint8Array;
  readonly playerShipPositions: Ships;
  readonly playerShipState?: ShipState;
};

export const createBattleshipPrivateState = (localSecretKey: Uint8Array, playerShipPositions: Ships) => ({
  localSecretKey,
  playerShipPositions,
  playerShipState: undefined,
});

export const westWitnesses = {
  local_secret_key: ({ privateState }: WitnessContext<Ledger, BattleshipPrivateState>): [BattleshipPrivateState, Uint8Array] => [
    privateState,
    privateState.localSecretKey,
  ],
  player_ship_positions: ({ privateState }: WitnessContext<Ledger, BattleshipPrivateState>): [BattleshipPrivateState, Ships] => [
    privateState,
    privateState.playerShipPositions,
  ],
  player_ship_state: ({ privateState }: WitnessContext<Ledger, BattleshipPrivateState>): [BattleshipPrivateState, ShipState] => [
    privateState,
    privateState.playerShipState || {
      s21: [],
      s31: [],
      s32: [],
      s41: [],
      s51: [],
    },
  ],
  set_player_ship_state: (
    { privateState }: WitnessContext<Ledger, BattleshipPrivateState>,
    playerShipState: ShipState,
  ): [BattleshipPrivateState, []] => [{ ...privateState, playerShipState }, []],
};

export const compiledBattleshipWestContract = CompiledContract.make<Contract<BattleshipPrivateState>>(
  'battleship_west',
  Contract,
).pipe(
  CompiledContract.withWitnesses(westWitnesses),
  CompiledContract.withCompiledFileAssets('./managed/battleship_west'),
);
