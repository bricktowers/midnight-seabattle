import { describe, expect, test } from '@jest/globals';
import { BattleshipSimulator, randomSk } from './battleship-east-setup';
import { Ships, GAME_STATE, getEastOccupiedCells, SHOT_RESULT, validateShips } from '../index';
import * as fc from 'fast-check';

const player1Ships: Ships = {
  s11: { x: 2n, y: 7n },
  s12: { x: 10n, y: 6n },
  s13: { x: 6n, y: 5n },
  s14: { x: 9n, y: 8n },
  s21: { x: 6n, y: 7n },
  s22: { x: 1n, y: 1n },
  s23: { x: 1n, y: 9n },
  s31: { x: 10n, y: 1n },
  s32: { x: 3n, y: 3n },
  s41: { x: 8n, y: 1n },
  v21: true,
  v22: false,
  v23: false,
  v31: true,
  v32: true,
  v41: true,
};
const player2Ships: Ships = {
  s11: { x: 4n, y: 1n },
  s12: { x: 9n, y: 3n },
  s13: { x: 10n, y: 10n },
  s14: { x: 1n, y: 9n },
  s21: { x: 2n, y: 1n },
  s22: { x: 9n, y: 6n },
  s23: { x: 7n, y: 10n },
  s31: { x: 3n, y: 4n },
  s32: { x: 1n, y: 5n },
  s41: { x: 6n, y: 5n },
  v21: true,
  v22: true,
  v23: false,
  v31: true,
  v32: true,
  v41: true,
};
const p1secretKey = randomSk();

const p2secretKey = randomSk();

const coordArbitrary = fc.record({
  x: fc.bigInt({ min: BigInt(1), max: BigInt(10) }),
  y: fc.bigInt({ min: BigInt(1), max: BigInt(10) }),
});

const shipsArbitrary = fc.record({
  s11: coordArbitrary,
  s12: coordArbitrary,
  s13: coordArbitrary,
  s14: coordArbitrary,
  s21: coordArbitrary,
  s22: coordArbitrary,
  s23: coordArbitrary,
  s31: coordArbitrary,
  s32: coordArbitrary,
  s41: coordArbitrary,
  v21: fc.boolean(),
  v22: fc.boolean(),
  v23: fc.boolean(),
  v31: fc.boolean(),
  v32: fc.boolean(),
  v41: fc.boolean(),
});

const validShipsArbitrary = shipsArbitrary.filter((ships: Ships) => validateShips(ships));

function createGame() {
  const simulator = BattleshipSimulator.deployBattleshipContract(p1secretKey, player1Ships);
  const initialLS = simulator.getLedgerState();
  expect(initialLS.gameState).toBe(GAME_STATE.waiting_p1);

  simulator.createPlayerPrivateState('p2', p2secretKey, player2Ships, undefined);
  return simulator;
}

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
      { numRuns: 10 },
    );
  });

  test('Return miss in case of non-ship coordinate', () => {
    const simulator = createGame();

    let p1state = simulator.as('p1').join_p1();
    expect(p1state.gameState).toBe(GAME_STATE.waiting_p2);

    let p2state = simulator.as('p2').join_p2();
    expect(p2state.gameState).toBe(GAME_STATE.p1_turn);

    const occupiedCells = new Set(getEastOccupiedCells(player2Ships).map((cell) => `${cell.x},${cell.y}`));

    for (let x = 1; x <= 10; x++) {
      for (let y = 1; y <= 10; y++) {
        const cellKey = `${x},${y}`;
        if (occupiedCells.has(cellKey)) return;
        p1state = simulator.as('p1').turn_player1({ x: BigInt(x), y: BigInt(y) });
        p2state = simulator.as('p2').turn_player2({ x: 1n, y: 2n });
        expect(p2state.lastShotResult.value.result).toBe(SHOT_RESULT.miss);
        expect(p1state.lastShotResult.value.result).toBe(SHOT_RESULT.miss);
      }
    }
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

function expectNeighbourIsDetected(ships: Ships) {
  expectJoinFailed(ships, "failed assert: Ships can't be adjacent");
  expect(validateShips(ships)).toBe(false);
}

describe('Ship Placement Rules', () => {
  test('Reject overlapping ships', () => {
    expectOverlappingIsDetected({ ...player1Ships, s11: player1Ships.s12 });
    expectOverlappingIsDetected({ ...player1Ships, s11: player1Ships.s13 });
    expectOverlappingIsDetected({ ...player1Ships, s11: player1Ships.s14 });
    expectOverlappingIsDetected({ ...player1Ships, s11: player1Ships.s21 });
    expectOverlappingIsDetected({ ...player1Ships, s11: player1Ships.s22 });
    expectOverlappingIsDetected({ ...player1Ships, s21: player1Ships.s23 });
    expectOverlappingIsDetected({ ...player1Ships, s41: player1Ships.s31 });
    expectOverlappingIsDetected({ ...player1Ships, s32: player1Ships.s31 });
  });
  test('Reject overlapping ships', () => {
    expectNeighbourIsDetected({ ...player1Ships, s11: { x: 10n, y: 7n } });
    expectNeighbourIsDetected({ ...player1Ships, s11: { x: 10n, y: 8n } });
    expectNeighbourIsDetected({ ...player1Ships, s11: { x: 7n, y: 1n } });
  });
  test("Reject ships that don't fit on the board", () => {
    expectJoinFailed({ ...player1Ships, s11: { x: 11n, y: 7n } }, 'failed assert: Ship is out of the board');
    expectJoinFailed({ ...player1Ships, s11: { x: 10n, y: 11n } }, 'failed assert: Ship is out of the board');
    expectJoinFailed({ ...player1Ships, s11: { x: 0n, y: 7n } }, 'failed assert: Ship is out of the board');
    expectJoinFailed({ ...player1Ships, s11: { x: 10n, y: 0n } }, 'failed assert: Ship is out of the board');
  });
});
