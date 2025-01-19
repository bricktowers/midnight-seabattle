import { type ContractAddress, tokenType } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';
import {
  type BattleshipContract,
  type BattleshipDerivedState,
  type BattleshipProviders,
  type DeployedBattleshipContract,
  emptyState,
  type BattleshipPrivateStates,
  type UserAction,
} from './common-types.js';
import {
  type BattleshipPrivateState,
  Contract,
  type Coord,
  createBattleshipPrivateState,
  ledger,
  pureCircuits,
  type Ships,
  westWitnesses,
  type CoinInfo,
} from '@bricktowers/battleship-west-contract';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, concat, defer, from, map, type Observable, of, retry, scan, Subject } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { updateBoard, updatePartialShips } from './commons.js';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types/dist/private-state-provider';
import { encodeTokenType } from '@midnight-ntwrk/onchain-runtime';
import { encodeContractAddress } from '@midnight-ntwrk/ledger';

const battleshipContract: BattleshipContract = new Contract(westWitnesses);

export interface DeployedBattleshipAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<BattleshipDerivedState>;

  turn_player1: (value: Coord) => Promise<void>;
  turn_player2: (value: Coord) => Promise<void>;
  join_p1: () => Promise<void>;
  join_p2: () => Promise<void>;
  set_board: (ships: Ships) => Promise<void>;
}

export class BattleshipAPI implements DeployedBattleshipAPI {
  private constructor(
    public readonly gameId: string,
    public readonly tokenContractAddress: ContractAddress,
    public readonly deployedContract: DeployedBattleshipContract,
    public readonly providers: BattleshipProviders,
    private readonly logger: Logger,
  ) {
    const combine = (acc: BattleshipDerivedState, value: BattleshipDerivedState): BattleshipDerivedState => {
      const p1PartialShips = updatePartialShips(acc.p1PartialShips, value, 'p1');
      const p2PartialShips = updatePartialShips(acc.p2PartialShips, value, 'p2');
      return {
        state: value.state,
        p1: value.p1 ?? acc.p1,
        p2: value.p2 ?? acc.p2,
        shotAttempt: value.shotAttempt,
        lastShotResult: value.lastShotResult,
        whoami: value.whoami,
        p1Board: updateBoard(acc.p1Board, p1PartialShips, value, value.p1 ?? 'unknown', 'p1'),
        p2Board: updateBoard(acc.p2Board, p2PartialShips, value, value.p2 ?? 'unknown', 'p2'),
        p1PartialShips,
        p2PartialShips,
        privateShips: value.privateShips ?? acc.privateShips,
        lastTurn: value.lastTurn,
      };
    };

    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.turns$ = new Subject<UserAction>();
    this.privateStates$ = new Subject<BattleshipPrivateState>();
    this.state$ = combineLatest(
      [
        providers.publicDataProvider
          .contractStateObservable(this.deployedContractAddress, { type: 'all' })
          .pipe(map((contractState) => ledger(contractState.data))),
        concat(
          from(defer(() => providers.privateStateProvider.get(gameId) as Promise<BattleshipPrivateState>)),
          this.privateStates$,
        ),
        concat(of<UserAction>({ playerHit: undefined, playerCancel: undefined }), this.turns$),
      ],
      (ledgerState, privateState, userActions) => {
        const whoami = pureCircuits.public_key(privateState.localSecretKey);
        const result: BattleshipDerivedState = {
          state: ledgerState.gameState,
          p1: ledgerState.p1.is_some ? toHex(ledgerState.p1.value) : undefined,
          p2: ledgerState.p2.is_some ? toHex(ledgerState.p2.value) : undefined,
          whoami: toHex(whoami),
          shotAttempt: ledgerState.shotAttempt,
          lastShotResult: ledgerState.lastShotResult.is_some
            ? {
                cell: ledgerState.lastShotResult.value.cell,
                player: toHex(ledgerState.lastShotResult.value.player),
                result: ledgerState.lastShotResult.value.result,
                ship_def: ledgerState.lastShotResult.value.ship_def,
              }
            : undefined,
          privateShips: privateState.playerShipPositions,
          p1Board: emptyState.p1Board,
          p2Board: emptyState.p2Board,
          lastTurn: userActions.playerHit,
          lastCancel: userActions.playerCancel,
          p1PartialShips: emptyState.p1PartialShips,
          p2PartialShips: emptyState.p2PartialShips,
        };
        return result;
      },
    ).pipe(
      scan(combine, emptyState),
      retry({
        // sometimes websocket fails which is why we retry
        delay: 500,
      }),
    );
  }

  readonly deployedContractAddress: ContractAddress;

  readonly state$: Observable<BattleshipDerivedState>;

  readonly turns$: Subject<UserAction>;

  readonly privateStates$: Subject<BattleshipPrivateState>;

  async turn_player1(value: Coord): Promise<void> {
    this.logger?.info({ player1turn: value });
    this.turns$.next({
      playerHit: {
        player: 'p1',
        cell: value,
      },
      playerCancel: undefined,
    });

    try {
      const txData = await this.deployedContract.callTx.turn_player1(value);
      this.logger?.trace({
        player1madeTurn: {
          value,
          txHash: txData.public.txHash,
          blockHeight: txData.public.blockHeight,
        },
      });
    } catch (e) {
      this.turns$.next({
        playerCancel: {
          player: 'p1',
          cell: value,
        },
        playerHit: undefined,
      });
      throw e;
    }
  }

  async turn_player2(value: Coord): Promise<void> {
    this.logger?.info({ player2turn: value });
    this.turns$.next({
      playerHit: {
        player: 'p2',
        cell: value,
      },
      playerCancel: undefined,
    });
    try {
      const txData = await this.deployedContract.callTx.turn_player2(value);
      this.logger?.trace({
        player2madeTurn: {
          value,
          txHash: txData.public.txHash,
          blockHeight: txData.public.blockHeight,
        },
      });
    } catch (e) {
      this.turns$.next({
        playerCancel: {
          player: 'p2',
          cell: value,
        },
        playerHit: undefined,
      });
      throw e;
    }
  }

  async set_board(ships: Ships): Promise<void> {
    const initialState = await BattleshipAPI.getOrCreateInitialPrivateState(this.providers.privateStateProvider);
    const newState = createBattleshipPrivateState(initialState.localSecretKey, ships);
    await this.providers.privateStateProvider.set(this.gameId, newState);
    this.privateStates$.next(newState);
  }

  coin(): CoinInfo {
    return {
      nonce: utils.randomBytes(32),
      color: encodeTokenType(tokenType(utils.pad('brick_towers_coin', 32), this.tokenContractAddress)),
      value: 100n,
    };
  }

  async join_p1(): Promise<void> {
    this.logger.info('join_p1');
    const txData = await this.deployedContract.callTx.join_p1(this.coin());
    this.logger.trace({
      player1Joined: {
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async join_p2(): Promise<void> {
    this.logger.info('join_p2');
    const txData = await this.deployedContract.callTx.join_p2(this.coin());
    this.logger.trace({
      player2Joined: {
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  static async deploy(
    gameId: string,
    tokenContractAddress: string,
    providers: BattleshipProviders,
    logger: Logger,
  ): Promise<BattleshipAPI> {
    logger.info({
      deployContract: {
        gameId,
      },
    });
    const deployedGameContract = await deployContract(providers, {
      privateStateKey: gameId,
      contract: battleshipContract,
      initialPrivateState: await BattleshipAPI.getPrivateState(gameId, providers.privateStateProvider),
      args: [
        {
          bytes: encodeContractAddress(tokenContractAddress),
        },
      ],
    });

    logger.trace({
      contractDeployed: {
        gameId,
        finalizedDeployTxData: deployedGameContract.deployTxData.public,
      },
    });

    return new BattleshipAPI(gameId, tokenContractAddress, deployedGameContract, providers, logger);
  }

  static async subscribe(
    gameId: string,
    tokenContractAddress: ContractAddress,
    providers: BattleshipProviders,
    contractAddress: ContractAddress,
    logger: Logger,
  ): Promise<BattleshipAPI> {
    logger.info({
      subscribeContract: {
        gameId,
        contractAddress,
      },
    });

    const deployedGameContract = await findDeployedContract(providers, {
      contractAddress,
      contract: battleshipContract,
      privateStateKey: gameId,
      initialPrivateState: await BattleshipAPI.getPrivateState(gameId, providers.privateStateProvider),
    });

    logger.trace({
      contractSubscribed: {
        gameId,
        finalizedDeployTxData: deployedGameContract.deployTxData.public,
      },
    });

    return new BattleshipAPI(gameId, tokenContractAddress, deployedGameContract, providers, logger);
  }

  static async getOrCreateInitialPrivateState(
    privateStateProvider: PrivateStateProvider<BattleshipPrivateStates>,
  ): Promise<BattleshipPrivateState> {
    let state = await privateStateProvider.get('initial');
    if (state === null) {
      state = this.createPrivateState(utils.randomBytes(32));
      await privateStateProvider.set('initial', state);
    }
    return state;
  }

  static async gameExists(providers: BattleshipProviders, contractAddress: ContractAddress): Promise<boolean> {
    // here we are forced by the API to create a private state to check if the contract exists
    try {
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      if (state === null) {
        return false;
      }
      void ledger(state.data); // try to parse it
      return true;
    } catch (e) {
      return false;
    }
  }

  static async getPublicKey(providers: BattleshipProviders): Promise<Uint8Array> {
    const state = await this.getOrCreateInitialPrivateState(providers.privateStateProvider);
    return pureCircuits.public_key(state.localSecretKey);
  }

  private static async getPrivateState(
    gameId: string,
    providers: PrivateStateProvider<BattleshipPrivateStates>,
  ): Promise<BattleshipPrivateState> {
    const existingPrivateState = await providers.get(gameId);
    const initialState = await this.getOrCreateInitialPrivateState(providers);
    return existingPrivateState ?? this.createPrivateState(initialState.localSecretKey);
  }

  private static createPrivateState(localSecretKey: Uint8Array): BattleshipPrivateState {
    const emptyBoard: Ships = {
      s21: { x: 0n, y: 0n },
      s31: { x: 0n, y: 0n },
      s32: { x: 0n, y: 0n },
      s41: { x: 0n, y: 0n },
      s51: { x: 0n, y: 0n },
      v21: false,
      v31: false,
      v32: false,
      v41: false,
      v51: false,
    };
    return createBattleshipPrivateState(localSecretKey, emptyBoard);
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
