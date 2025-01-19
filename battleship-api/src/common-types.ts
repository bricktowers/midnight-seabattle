import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  GAME_STATE,
  type BattleshipPrivateState,
  type Contract,
  type Witnesses,
  type SHOT_RESULT,
  type Coord,
  type Ships,
  type PartialShips,
  type ShipDef,
} from '@bricktowers/battleship-west-contract';

export type BattleshipPrivateStates = Record<string, BattleshipPrivateState>;

export type BattleshipContract = Contract<BattleshipPrivateState, Witnesses<BattleshipPrivateState>>;

export type BattleshipCircuitKeys = Exclude<keyof BattleshipContract['impureCircuits'], number | symbol>;

export type BattleshipProviders = MidnightProviders<BattleshipCircuitKeys, BattleshipPrivateStates>;

export type DeployedBattleshipContract = FoundContract<BattleshipPrivateState, BattleshipContract>;

export type PlayerHit = {
  cell: Coord;
  player: 'p1' | 'p2';
};

export type UserAction = {
  playerHit: PlayerHit | undefined;
  playerCancel: PlayerHit | undefined;
};

export type LastShotResult = {
  cell: Coord;
  result: SHOT_RESULT;
  player: string;
  ship_def: ShipDef;
};

export enum BOARD_STATE {
  empty = 0,
  ship = 1,
  ship_sunk = 2,
  ship_hit = 3,
  attempt = 4,
  miss = 5,
}

export type BattleshipDerivedState = {
  readonly state: GAME_STATE;
  readonly p1?: string;
  readonly p2?: string;
  readonly whoami: string;
  readonly shotAttempt: Coord;
  readonly lastShotResult?: LastShotResult;
  readonly p1Board: BOARD_STATE[][];
  readonly p2Board: BOARD_STATE[][];
  readonly privateShips?: Ships;
  readonly p1PartialShips: PartialShips;
  readonly p2PartialShips: PartialShips;
  readonly lastTurn?: PlayerHit;
  readonly lastCancel?: PlayerHit;
};

export const emptyState: BattleshipDerivedState = {
  state: GAME_STATE.waiting_p1,
  p1: undefined,
  p2: undefined,
  shotAttempt: {
    x: 0n,
    y: 0n,
  },
  lastShotResult: undefined,
  whoami: 'unknown',
  p1Board: Array(10).fill(Array(10).fill(BOARD_STATE.empty)) as BOARD_STATE[][],
  p2Board: Array(10).fill(Array(10).fill(BOARD_STATE.empty)) as BOARD_STATE[][],
  privateShips: undefined,
  lastTurn: undefined,
  p1PartialShips: {
    v21: false,
    v31: false,
    v32: false,
    v41: false,
    v51: false,
  },
  p2PartialShips: {
    v21: false,
    v31: false,
    v32: false,
    v41: false,
    v51: false,
  },
};

export type GameContract = {
  address: string;
  p1: string | undefined;
  p2: string | undefined;
  gameState: GAME_STATE;
};
