import { GAME_STATE, getOccupiedCells, type Ships } from '@bricktowers/battleship-west-contract';
import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { webcrypto } from 'crypto';
import path from 'path';
import { BattleshipAPI, type BattleshipProviders, BOARD_STATE, emptyState } from '..';
import { type BrickTowersCoinContract, type BrickTowersCoinProviders, TestEnvironment, TestProviders } from './commons';
import { Contract } from '@bricktowers/token-contract';
import { currentDir } from './config';
import { createLogger } from './logger-utils';
import { prettyPrintBoard } from '../commons';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { randomBytes } from '../utils';
import { type ContractAddress } from '@midnight-ntwrk/ledger';

const logDir = path.resolve(currentDir, '..', 'logs', 'tests', `${new Date().toISOString()}.log`);
const logger = await createLogger(logDir);

// @ts-expect-error It is required
globalThis.crypto = webcrypto;

globalThis.WebSocket = WebSocket;

describe('Board', () => {
  it('should print a board', () => {
    const boardState = [
      [
        BOARD_STATE.ship_sunk,
        BOARD_STATE.miss,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
      [
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
      [
        BOARD_STATE.ship,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.attempt,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
      [
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
      [
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
      [
        BOARD_STATE.ship,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
      [
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
      [
        BOARD_STATE.ship,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
      [
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
      [
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
        BOARD_STATE.empty,
      ],
    ];
    expect(prettyPrintBoard(boardState)).toEqual(
      '\n' +
        '+-----------------------------+\n' +
        '| X  O                         |\n' +
        '|                              |\n' +
        '| S        ?                   |\n' +
        '|                              |\n' +
        '|                              |\n' +
        '| S                            |\n' +
        '|                              |\n' +
        '| S                            |\n' +
        '|                              |\n' +
        '|                              |\n' +
        '+-----------------------------+',
    );
  });
});

describe('Game', () => {
  let testEnvironment: TestEnvironment;
  let wallet: Wallet & Resource;
  let wallet2: Wallet & Resource;
  let providers1: BattleshipProviders;
  let providers2: BattleshipProviders;
  let tokenAddress: ContractAddress;
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
  const player2ships: Ships = {
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
  async function mint(tokenProvider: BrickTowersCoinProviders) {
    const brickTowersCoinContract: BrickTowersCoinContract = new Contract({});
    await tokenProvider.privateStateProvider.set('coin2', {});
    const contractDeployed = await findDeployedContract(tokenProvider, {
      privateStateKey: 'coin2',
      contractAddress: tokenAddress,
      contract: brickTowersCoinContract,
    });
    await contractDeployed.callTx.mint();
  }
  async function deploy(tokenProvider: BrickTowersCoinProviders) {
    const brickTowersCoinContract: BrickTowersCoinContract = new Contract({});
    const deployedContract = await deployContract(tokenProvider, {
      privateStateKey: 'coin',
      contract: brickTowersCoinContract,
      initialPrivateState: {},
      args: [randomBytes(32)],
    });
    tokenAddress = deployedContract.deployTxData.public.contractAddress;
  }
  beforeAll(async () => {
    testEnvironment = new TestEnvironment(logger);
    const testConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getWallet1();
    wallet2 = await testEnvironment.getWallet2();
    logger.info('Wallets created');
    providers1 = await new TestProviders().configureBattleshipProviders(wallet, testConfiguration.dappConfig);
    providers2 = await new TestProviders().configureBattleshipProviders(wallet2, testConfiguration.dappConfig);
    const tokenProvider1 = await new TestProviders().configureBrickTowersTokenProviders(
      wallet,
      testConfiguration.dappConfig,
    );
    await deploy(tokenProvider1);
    const tokenProvider2 = await new TestProviders().configureBrickTowersTokenProviders(
      wallet2,
      testConfiguration.dappConfig,
    );
    await mint(tokenProvider1);
    await mint(tokenProvider2);
  }, 10 * 60_000);

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  it('should simulate full game', async () => {
    const player1gameId = 'gameId1';
    const player2gameId = 'gameId2';
    const player1 = await BattleshipAPI.deploy(player1gameId, tokenAddress, providers1, logger);
    let player1State = emptyState;
    await player1.set_board(player1Ships);
    const player1Subscription = player1.state$.subscribe((bBoardState) => {
      player1State = bBoardState;
    });
    logger.info('Player 1 sets the board');
    expect(player1State.state).toEqual(GAME_STATE.waiting_p1);
    await player1.join_p1();
    expect(player1State.state).toEqual(GAME_STATE.waiting_p2);
    logger.info('Player 1 inserted');
    expect(player1State.privateShips).toEqual(player1Ships);
    expect(player1State.p1).toEqual(player1State.whoami);

    const player2 = await BattleshipAPI.subscribe(
      player2gameId,
      tokenAddress,
      providers2,
      player1.deployedContractAddress,
      logger,
    );
    await player2.set_board(player2ships);
    let player2State = emptyState;
    const player2Subscription = player2.state$.subscribe((bBoardState) => {
      player2State = bBoardState;
    });
    logger.info('Player 2 sets the board');
    await player2.join_p2();
    logger.info('Player 2 joined');
    expect(player2State.state).toEqual(GAME_STATE.p1_turn);
    expect(player2State.privateShips).toEqual(player2ships);

    const p1 = prettyPrintBoard(player1State.p1Board);
    const p2 = prettyPrintBoard(player2State.p2Board);

    expect(p1).toEqual(
      '\n' +
        '+-----------------------------+\n' +
        '|                              |\n' +
        '| S  S  S  S           S  S  S |\n' +
        '|                              |\n' +
        '|                              |\n' +
        '|                      S  S  S |\n' +
        '|                              |\n' +
        '|                S  S  S  S  S |\n' +
        '|                              |\n' +
        '|             S                |\n' +
        '|             S                |\n' +
        '+-----------------------------+',
    );
    expect(p2).toEqual(
      '\n' +
        '+-----------------------------+\n' +
        '|                            S |\n' +
        '|    S                       S |\n' +
        '|    S                       S |\n' +
        '|                            S |\n' +
        '| S  S  S  S  S                |\n' +
        '|                              |\n' +
        '|                              |\n' +
        '| S                            |\n' +
        '| S           S  S  S          |\n' +
        '| S                            |\n' +
        '+-----------------------------+',
    );

    const p2coordinates = getOccupiedCells(player2ships);
    const p1coordinates = getOccupiedCells(player1Ships);

    for (let index = 0; index < p1coordinates.length; index++) {
      const p1ship = p1coordinates[index];
      const p2ship = p2coordinates[index];

      await player1.turn_player1(p2ship);
      await player2.turn_player2(p1ship);
    }
    expect(player1State.state).toEqual(GAME_STATE.p1_wins);

    player1Subscription.unsubscribe();
    player2Subscription.unsubscribe();
  });
});
