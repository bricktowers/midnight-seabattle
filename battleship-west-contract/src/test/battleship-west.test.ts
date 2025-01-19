import { describe, expect, test } from '@jest/globals';
import { BattleshipSimulator, randomSk } from './battleship-west-setup';
import { convertPartialShips, Coord, GAME_STATE, getOccupiedCells, SHIP, Ships, SHOT_RESULT, validateShips } from '../index.js';
import * as fc from 'fast-check';

const player1Ships: Ships = {
  s21: { x: 5n, y: 9n },
  s31: { x: 8n, y: 2n },
  s32: { x: 8n, y: 5n },
  s41: { x: 1n, y: 2n },
  s51: { x: 6n, y: 7n },
  v21: true,
  v31: false,
  v32: false,
  v41: false,
  v51: false,
};
const player2Ships: Ships = {
  s21: { x: 2n, y: 2n },
  s31: { x: 1n, y: 8n },
  s32: { x: 5n, y: 9n },
  s41: { x: 10n, y: 1n },
  s51: { x: 1n, y: 5n },
  v21: true,
  v31: true,
  v32: false,
  v41: true,
  v51: false,
};
const p1secretKey = randomSk();

const p2secretKey = randomSk();

function emptyCoord(): Coord {
  return { x: 0n, y: 0n };
}

function expectJoinFailed(ships: Ships, expectedMessage: string) {
  expect(() => {
    const simulator = BattleshipSimulator.deployBattleshipContract(p1secretKey, ships);
    simulator.as('p1').join_p1();
  }).toThrow(expectedMessage);
  expect(validateShips(ships)).toBe(false);
}

function expectOverlappingIsDetected(ships: Ships) {
  expectJoinFailed(ships, 'failed assert: Ship cells must be unique');
  expect(validateShips(ships)).toBe(false);
}

function expectOverlappingIsNotDetected(ships: Ships) {
  const simulator = BattleshipSimulator.deployBattleshipContract(p1secretKey, ships);
  simulator.as('p1').join_p1();
  expect(validateShips(ships)).toBe(true);
}

function createGame() {
  const simulator = BattleshipSimulator.deployBattleshipContract(p1secretKey, player1Ships);
  const initialLS = simulator.getLedgerState();
  expect(initialLS.gameState).toBe(GAME_STATE.waiting_p1);

  simulator.createPlayerPrivateState('p2', p2secretKey, player2Ships, undefined);
  return simulator;
}

// Generator for Coord
const coordArbitrary = fc.record({
  x: fc.bigInt({ min: BigInt(1), max: BigInt(10) }),
  y: fc.bigInt({ min: BigInt(1), max: BigInt(10) }),
});

// Generator for Ships
const shipsArbitrary = fc.record({
  s21: coordArbitrary,
  s31: coordArbitrary,
  s32: coordArbitrary,
  s41: coordArbitrary,
  s51: coordArbitrary,
  v21: fc.boolean(),
  v31: fc.boolean(),
  v32: fc.boolean(),
  v41: fc.boolean(),
  v51: fc.boolean(),
});

const validShipsArbitrary = shipsArbitrary.filter((ships: Ships) => validateShips(ships));

describe('Retrieve all ship coordinates', () => {
  test('Returns all coordinates for all ships', () => {
    expect(getOccupiedCells(player1Ships)).toStrictEqual([
      { x: 5n, y: 9n },
      { x: 5n, y: 10n },
      { x: 8n, y: 2n },
      { x: 9n, y: 2n },
      { x: 10n, y: 2n },
      { x: 8n, y: 5n },
      { x: 9n, y: 5n },
      { x: 10n, y: 5n },
      { x: 1n, y: 2n },
      { x: 2n, y: 2n },
      { x: 3n, y: 2n },
      { x: 4n, y: 2n },
      { x: 6n, y: 7n },
      { x: 7n, y: 7n },
      { x: 8n, y: 7n },
      { x: 9n, y: 7n },
      { x: 10n, y: 7n },
    ]);
    expect(getOccupiedCells(player2Ships)).toStrictEqual([
      { x: 2n, y: 2n },
      { x: 2n, y: 3n },
      { x: 1n, y: 8n },
      { x: 1n, y: 9n },
      { x: 1n, y: 10n },
      { x: 5n, y: 9n },
      { x: 6n, y: 9n },
      { x: 7n, y: 9n },
      { x: 10n, y: 1n },
      { x: 10n, y: 2n },
      { x: 10n, y: 3n },
      { x: 10n, y: 4n },
      { x: 1n, y: 5n },
      { x: 2n, y: 5n },
      { x: 3n, y: 5n },
      { x: 4n, y: 5n },
      { x: 5n, y: 5n },
    ]);
    expect(
      getOccupiedCells({
        s51: { x: 1n, y: 1n },
        v21: true,
        v31: true,
        v32: true,
        v41: true,
        v51: true,
      }),
    ).toStrictEqual([
      { x: 1n, y: 1n },
      { x: 1n, y: 2n },
      { x: 1n, y: 3n },
      { x: 1n, y: 4n },
      { x: 1n, y: 5n },
    ]);
  });
});

describe('Game Play', () => {
  test('Player 1 wins the game quickly', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });

    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });

    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.miss);

    p1state = simulator.as('p1').turn_player1({ x: 2n, y: 2n });
    p2state = simulator.as('p2').turn_player2({ x: 5n, y: 9n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 2n, y: 3n });
    p2state = simulator.as('p2').turn_player2({ x: 5n, y: 10n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_sunk);
    expect(p2state.lastShotResult.value.ship_def).toStrictEqual({ ship: SHIP.s21, ship_cell: { x: 2n, y: 2n }, ship_v: true });
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 8n });
    p2state = simulator.as('p2').turn_player2({ x: 8n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 9n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 10n });
    p2state = simulator.as('p2').turn_player2({ x: 10n, y: 2n });

    p1state = simulator.as('p1').turn_player1({ x: 5n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 8n, y: 5n });
    p1state = simulator.as('p1').turn_player1({ x: 6n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 9n, y: 5n });
    p1state = simulator.as('p1').turn_player1({ x: 7n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 10n, y: 5n });

    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 1n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 2n });
    p2state = simulator.as('p2').turn_player2({ x: 2n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 3n });
    p2state = simulator.as('p2').turn_player2({ x: 3n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 4n });
    p2state = simulator.as('p2').turn_player2({ x: 4n, y: 2n });

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 6n, y: 7n });
    p1state = simulator.as('p1').turn_player1({ x: 2n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 7n, y: 7n });
    p1state = simulator.as('p1').turn_player1({ x: 3n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 8n, y: 7n });
    p1state = simulator.as('p1').turn_player1({ x: 4n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 9n, y: 7n });
    p1state = simulator.as('p1').turn_player1({ x: 5n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 10n, y: 7n });

    p1state = simulator.as('p1').getLedgerState();
    p2state = simulator.as('p2').getLedgerState();
    expect(p2state.gameState).toBe(GAME_STATE.p1_wins);
  });
  test('Player 2 wins the game quickly', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });

    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });

    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.miss);

    p1state = simulator.as('p1').turn_player1({ x: 2n, y: 2n });
    p2state = simulator.as('p2').turn_player2({ x: 5n, y: 9n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 2n, y: 3n });
    p2state = simulator.as('p2').turn_player2({ x: 5n, y: 10n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_sunk);
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 8n });
    p2state = simulator.as('p2').turn_player2({ x: 8n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 9n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 10n });
    p2state = simulator.as('p2').turn_player2({ x: 10n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 5n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 8n, y: 5n });
    p1state = simulator.as('p1').turn_player1({ x: 6n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 9n, y: 5n });
    p1state = simulator.as('p1').turn_player1({ x: 7n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 10n, y: 5n });
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 1n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 2n });
    p2state = simulator.as('p2').turn_player2({ x: 2n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 3n });
    p2state = simulator.as('p2').turn_player2({ x: 3n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 4n });
    p2state = simulator.as('p2').turn_player2({ x: 4n, y: 2n });
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 6n, y: 7n });
    p1state = simulator.as('p1').turn_player1({ x: 2n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 7n, y: 7n });
    p1state = simulator.as('p1').turn_player1({ x: 3n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 8n, y: 7n });
    p1state = simulator.as('p1').turn_player1({ x: 4n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 9n, y: 7n });
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });
    p2state = simulator.as('p2').turn_player2({ x: 10n, y: 7n });
    p1state = simulator.as('p1').turn_player1({ x: 5n, y: 5n });
    p1state = simulator.as('p1').getLedgerState();
    p2state = simulator.as('p2').getLedgerState();
    expect(p2state.gameState).toBe(GAME_STATE.p2_wins);
  });
});

describe('Player Turn Validation', () => {
  test("Reject action when it's not the player's turn", () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    const p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    expect(() => simulator.as('p2').turn_player2({ x: 1n, y: 1n })).toThrow("failed assert: It is not 2nd player's turn");

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });

    expect(() => simulator.as('p1').turn_player1({ x: 1n, y: 1n })).toThrow("failed assert: It is not 1st player's turn");
  });
});

describe('Player Joining', () => {
  test('Prevent joining with invalid coin', () => {
    expect(() => {
      const simulator = BattleshipSimulator.deployBattleshipContract(p1secretKey, player1Ships);
      simulator.join_p1_with_coin({
        nonce: randomSk(),
        color: new Uint8Array(32),
        value: BigInt(100),
      });
    }).toThrow('failed assert: Invalid coin');
    const simulator = createGame();
    simulator.join_p1();
    expect(() => {
      simulator.as('p2').join_p2_with_coin({
        nonce: randomSk(),
        color: new Uint8Array(32),
        value: BigInt(100),
      });
    }).toThrow('failed assert: Invalid coin');
  });
  test('Prevent joining with wrong amount coin', () => {
    expect(() => {
      const simulator = BattleshipSimulator.deployBattleshipContract(p1secretKey, player1Ships);
      simulator.join_p1_with_coin({
        nonce: randomSk(),
        color: new Uint8Array(32),
        value: BigInt(99),
      });
    }).toThrow('failed assert: Game requires 100 coins');
    const simulator = createGame();
    simulator.join_p1();
    expect(() => {
      simulator.as('p2').join_p2_with_coin({
        nonce: randomSk(),
        color: new Uint8Array(32),
        value: BigInt(99),
      });
    }).toThrow('failed assert: Game requires 100 coins');
  });
  test('Prevent joining as player multiple times', () => {
    const simulator = createGame();

    const p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    expect(() => simulator.as('p1').join_p1()).toThrow(
      'failed assert: Attempted to join a game that is not waiting for player 1',
    );
  });
  test('Prevent joining as the same player twice', () => {
    const simulator = createGame();

    const p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    expect(() => simulator.as('p1').join_p2()).toThrow('failed assert: Already in the game');
  });
});
describe('Player Role Validation', () => {
  test('Reject action from a non-player', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    const p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    expect(() => simulator.as('p2').turn_player1({ x: 1n, y: 1n })).toThrow('failed assert: You are not the 1st player');

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });

    expect(() => simulator.as('p1').turn_player2({ x: 1n, y: 1n })).toThrow('failed assert: You are not the 2nd player');
  });
});

describe('Ship Sinking', () => {
  test('Sink s21 ship', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 2n, y: 2n });
    p2state = simulator.as('p2').turn_player2({ x: 5n, y: 9n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 2n, y: 3n });
    p2state = simulator.as('p2').turn_player2({ x: 5n, y: 10n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_sunk);
    expect(p2state.lastShotResult.value.ship_def).toStrictEqual({ ship: SHIP.s21, ship_cell: { x: 2n, y: 2n }, ship_v: true });
  });

  test('Sink s31 ship', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 8n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 10n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_sunk);
    expect(p2state.lastShotResult.value.ship_def).toStrictEqual({ ship: SHIP.s31, ship_cell: { x: 1n, y: 8n }, ship_v: true });
  });
  test('Sink s32 ship', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 5n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 6n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 7n, y: 9n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_sunk);
    expect(p2state.lastShotResult.value.ship_def).toStrictEqual({ ship: SHIP.s32, ship_cell: { x: 5n, y: 9n }, ship_v: false });
  });

  test('Sink s41 ship', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 1n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 2n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 3n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 10n, y: 4n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_sunk);
    expect(p2state.lastShotResult.value.ship_def).toStrictEqual({ ship: SHIP.s41, ship_cell: { x: 10n, y: 1n }, ship_v: true });
  });

  test('Sink s51 ship', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 2n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 3n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 4n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_hit);
    p1state = simulator.as('p1').turn_player1({ x: 5n, y: 5n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.ship_sunk);
    expect(p2state.lastShotResult.value.ship_def).toStrictEqual({ ship: SHIP.s51, ship_cell: { x: 1n, y: 5n }, ship_v: false });
  });
});

describe('Cheating Detection', () => {
  test('Detect cheating by Player 1 with ship state manipulation', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });

    simulator.createPlayerPrivateState('p2', p2secretKey, player2Ships, {
      s21: [emptyCoord(), emptyCoord()],
      s31: [emptyCoord(), emptyCoord(), emptyCoord()],
      s32: [emptyCoord(), emptyCoord(), emptyCoord()],
      s41: [emptyCoord(), emptyCoord(), emptyCoord(), emptyCoord()],
      s51: [emptyCoord(), emptyCoord(), emptyCoord(), emptyCoord(), emptyCoord()],
    });

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });
    expect(() => {
      p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    }).toThrow('failed assert: Ship state hash mismatch');
  });

  test('Detect cheating by Player 1 with ship setup manipulation', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });

    simulator.createPlayerPrivateState('p2', p2secretKey, player1Ships, simulator.as('p2').getPrivateState().playerShipState);

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });
    expect(() => {
      p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
    }).toThrow('failed assert: Ships hash mismatch');
  });

  test('Detect cheating by Player 2 with ship state manipulation', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });

    simulator.createPlayerPrivateState('p1', p1secretKey, player1Ships, {
      s21: [emptyCoord(), emptyCoord()],
      s31: [emptyCoord(), emptyCoord(), emptyCoord()],
      s32: [emptyCoord(), emptyCoord(), emptyCoord()],
      s41: [emptyCoord(), emptyCoord(), emptyCoord(), emptyCoord()],
      s51: [emptyCoord(), emptyCoord(), emptyCoord(), emptyCoord(), emptyCoord()],
    });

    expect(() => {
      p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });
    }).toThrow('failed assert: Ship state hash mismatch');
  });

  test('Detect cheating by Player 2 with ship setup manipulation', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });
    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });

    simulator.createPlayerPrivateState('p1', p1secretKey, player2Ships, simulator.as('p1').getPrivateState().playerShipState);

    expect(() => {
      p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });
    }).toThrow('failed assert: Ships hash mismatch');
  });
});

function joinGame(ships: Ships): void {
  const simulator = BattleshipSimulator.deployBattleshipContract(p1secretKey, ships);
  expect(() => simulator.as('p1').join_p1()).not.toThrow();
}

describe('Valid Gameplay', () => {
  test('Allow joining with valid coordinates', () => {
    fc.assert(
      fc.property(validShipsArbitrary, (ships: Ships) => {
        expect(() => joinGame(ships)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  test('Return miss in case of non-ship coordinate', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    const occupiedCells = new Set(getOccupiedCells(player2Ships).map((cell) => `${cell.x},${cell.y}`));

    for (let x = 1; x <= 10; x++) {
      for (let y = 1; y <= 10; y++) {
        const cellKey = `${x},${y}`;
        if (occupiedCells.has(cellKey)) return;
        p1state = simulator.as('p1').turn_player1({ x: BigInt(x), y: BigInt(y) });
        p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
        expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.miss);
        expect(p1state.lastShotResult.value.result).toBe(SHOT_RESULT.miss);
      }
    }
  });

  test('Allow play with valid coordinates', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    expect(() => {
      p1state = simulator.as('p1').turn_player1({ x: 0n, y: 0n });
    }).toThrow('failed assert: Ship is out of the board');
    expect(() => {
      p1state = simulator.as('p1').turn_player1({ x: 11n, y: 11n });
    }).toThrow('failed assert: Ship is out of the board');
    expect(() => {
      p1state = simulator.as('p1').turn_player1({ x: 12n, y: 5n });
    }).toThrow('failed assert: Ship is out of the board');
    p1state = simulator.as('p1').turn_player1({ x: 1n, y: 1n });

    expect(() => {
      p2state = simulator.as('p2').turn_player2({ x: 0n, y: 0n });
    }).toThrow('failed assert: Ship is out of the board');

    expect(() => {
      p2state = simulator.as('p2').turn_player2({ x: 1n, y: 0n });
    }).toThrow('failed assert: Ship is out of the board');

    expect(() => {
      p2state = simulator.as('p2').turn_player2({ x: 1n, y: 11n });
    }).toThrow('failed assert: Ship is out of the board');

    p2state = simulator.as('p2').turn_player2({ x: 1n, y: 1n });
  });
});

describe('Ship Placement Rules', () => {
  test('Reject overlapping ships', () => {
    expectOverlappingIsNotDetected(player1Ships);
    expectOverlappingIsNotDetected({ ...player1Ships, s21: { x: 6n, y: 9n }, v21: false });
    expectOverlappingIsNotDetected({ ...player1Ships, s21: { x: 6n, y: 9n }, v21: true });
    expectOverlappingIsNotDetected({ ...player1Ships, s41: { x: 2n, y: 2n }, v41: false });
    expectOverlappingIsDetected({ ...player1Ships, s21: { x: 6n, y: 7n }, v21: false });
    expectOverlappingIsDetected({ ...player1Ships, s21: { x: 6n, y: 7n }, v21: true });
    expectOverlappingIsDetected({ ...player1Ships, s31: { x: 8n, y: 5n }, v31: true });
    expectOverlappingIsDetected({ ...player1Ships, s51: { x: 5n, y: 9n }, v51: false });
    expectOverlappingIsDetected({ ...player1Ships, s41: { x: 8n, y: 2n }, v41: true });
    expectOverlappingIsDetected({ ...player1Ships, s32: { x: 8n, y: 2n }, v32: true });
    expectOverlappingIsDetected({ ...player1Ships, s32: player1Ships.s31 });
  });
  test("Reject ships that don't fit on the board", () => {
    expectJoinFailed({ ...player1Ships, s21: { x: 10n, y: 10n }, v21: false }, 'failed assert: Ship must fit on the board');
    expectJoinFailed({ ...player1Ships, s31: { x: 9n, y: 10n }, v31: false }, 'failed assert: Ship must fit on the board');
    expectJoinFailed({ ...player1Ships, s32: { x: 9n, y: 10n }, v32: false }, 'failed assert: Ship must fit on the board');
    expectJoinFailed({ ...player1Ships, s41: { x: 8n, y: 10n }, v41: false }, 'failed assert: Ship must fit on the board');
    expectJoinFailed({ ...player1Ships, s51: { x: 7n, y: 10n }, v51: false }, 'failed assert: Ship must fit on the board');

    expectJoinFailed({ ...player1Ships, s21: { x: 5n, y: 10n }, v21: true }, 'failed assert: Ship must fit on the board');
    expectJoinFailed({ ...player1Ships, s31: { x: 5n, y: 9n }, v31: true }, 'failed assert: Ship must fit on the board');
    expectJoinFailed({ ...player1Ships, s32: { x: 5n, y: 9n }, v32: true }, 'failed assert: Ship must fit on the board');
    expectJoinFailed({ ...player1Ships, s41: { x: 5n, y: 8n }, v41: true }, 'failed assert: Ship must fit on the board');
    expectJoinFailed({ ...player1Ships, s51: { x: 5n, y: 7n }, v51: true }, 'failed assert: Ship must fit on the board');
  });
});

describe('Utility Functionality', () => {
  test('Convert partial ship definitions to full ships', () => {
    expect(convertPartialShips({ ...player1Ships, s21: undefined })).toBe(undefined);
    expect(convertPartialShips({ ...player1Ships, s31: undefined })).toBe(undefined);
    expect(convertPartialShips({ ...player1Ships, s32: undefined })).toBe(undefined);
    expect(convertPartialShips({ ...player1Ships, s41: undefined })).toBe(undefined);
    expect(convertPartialShips({ ...player1Ships, s51: undefined })).toBe(undefined);
    expect(convertPartialShips(player1Ships)).toStrictEqual(player1Ships);
  });
});
