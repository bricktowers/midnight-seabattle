import { type Config, currentDir, StandaloneConfig } from './config';
import {
  DockerComposeEnvironment,
  GenericContainer,
  type StartedDockerComposeEnvironment,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';
import path from 'path';
import * as Rx from 'rxjs';
import { type CoinInfo, nativeToken, Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import type { Logger } from 'pino';
import type { Wallet } from '@midnight-ntwrk/wallet-api';
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import {
  type BalancedTransaction,
  createBalancedTx,
  type MidnightProvider,
  type MidnightProviders,
  type UnbalancedTransaction,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import type { BattleshipPrivateStates } from '../common-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider';
import { type Contract, type Witnesses } from '@bricktowers/token-contract';
import type { FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

export const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000042';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface BrickTowersCoinPrivateState {}
type BrickTowersCoinPrivateStates = Record<string, BrickTowersCoinPrivateState>;
type BrickTowersCoinCircuitKeys = Exclude<keyof BrickTowersCoinContract['impureCircuits'], number | symbol>;
export type BrickTowersCoinContract = Contract<BrickTowersCoinPrivateState, Witnesses<BrickTowersCoinPrivateState>>;
export type BrickTowersCoinProviders = MidnightProviders<BrickTowersCoinCircuitKeys, BrickTowersCoinPrivateStates>;
export type DeployedBrickTowersCoin = FoundContract<BrickTowersCoinPrivateState, BrickTowersCoinContract>;

export interface TestConfiguration {
  seed: string;
  entrypoint: string;
  dappConfig: Config;
  psMode: string;
}

export class LocalTestConfig implements TestConfiguration {
  seed = GENESIS_MINT_WALLET_SEED;
  entrypoint = 'dist/standalone.js';
  dappConfig = new StandaloneConfig();
  psMode = 'undeployed';
}

export class TestEnvironment {
  private readonly logger: Logger;
  private env: StartedDockerComposeEnvironment | undefined;
  private dockerEnv: DockerComposeEnvironment | undefined;
  private readonly container: StartedTestContainer | undefined;
  private testConfig: TestConfiguration;
  private testWallet1: TestWallet | undefined;
  private testWallet2: TestWallet | undefined;

  constructor(logger: Logger) {
    this.logger = logger;
    this.testConfig = new LocalTestConfig();
  }

  start = async (): Promise<TestConfiguration> => {
    if (process.env.RUN_STANDALONE === 'true') {
      this.logger.info('Running tests against standalone server...');
      this.testConfig = new LocalTestConfig();
    } else {
      this.testConfig = new LocalTestConfig();
      this.logger.info('Test containers starting...');
      const composeFile = process.env.COMPOSE_FILE ?? 'standalone.yml';
      this.logger.info(`Using compose file: ${composeFile}`);
      this.dockerEnv = new DockerComposeEnvironment(path.resolve(currentDir, '..', '..'), composeFile)
        .withWaitStrategy(
          'battleship-api-proof-server',
          Wait.forLogMessage('Actix runtime found; starting in Actix runtime', 1),
        )
        .withWaitStrategy('battleship-api-indexer', Wait.forLogMessage(/Transactions subscription started/, 1))
        .withWaitStrategy('battleship-api-node', Wait.forLogMessage(/Running JSON-RPC server/, 1));
      this.env = await this.dockerEnv.up();

      this.testConfig.dappConfig = {
        ...this.testConfig.dappConfig,
        indexer: TestEnvironment.mapContainerPort(
          this.env,
          this.testConfig.dappConfig.indexer,
          'battleship-api-indexer',
        ),
        indexerWS: TestEnvironment.mapContainerPort(
          this.env,
          this.testConfig.dappConfig.indexerWS,
          'battleship-api-indexer',
        ),
        node: TestEnvironment.mapContainerPort(this.env, this.testConfig.dappConfig.node, 'battleship-api-node'),
        proofServer: TestEnvironment.mapContainerPort(
          this.env,
          this.testConfig.dappConfig.proofServer,
          'battleship-api-proof-server',
        ),
      };
    }
    this.logger.info(`Configuration:${JSON.stringify(this.testConfig)}`);
    this.logger.info('Test containers started');
    return this.testConfig;
  };

  static mapContainerPort = (env: StartedDockerComposeEnvironment, url: string, containerName: string) => {
    const mappedUrl = new URL(url);
    const container = env.getContainer(containerName);

    mappedUrl.port = String(container.getFirstMappedPort());

    return mappedUrl.toString().replace(/\/+$/, '');
  };

  static getProofServerContainer = async (env: string = 'undeployed') =>
    await new GenericContainer('ghcr.io/midnight-ntwrk/proof-server:3.0.2')
      .withExposedPorts(6300)
      .withCommand([`midnight-proof-server --network ${env}`])
      .withEnvironment({ RUST_BACKTRACE: 'full' })
      .withWaitStrategy(Wait.forLogMessage('Actix runtime found; starting in Actix runtime', 1))
      .start();

  shutdown = async () => {
    if (this.testWallet1 !== undefined) {
      await this.testWallet1.close();
    }
    if (this.testWallet2 !== undefined) {
      await this.testWallet2.close();
    }
    if (this.env !== undefined) {
      this.logger.info('Test containers closing');
      await this.env.down();
    }
    if (this.container !== undefined) {
      this.logger.info('Test container closing');
      await this.container.stop();
    }
  };

  getWallet1 = async () => {
    this.testWallet1 = new TestWallet(this.logger);
    return await this.testWallet1.setup(this.testConfig);
  };

  getWallet2 = async () => {
    this.testWallet2 = new TestWallet(this.logger);
    return await this.testWallet2.setup(this.testConfig);
  };
}

export class TestWallet {
  private wallet: (Wallet & Resource) | undefined;
  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  setup = async (testConfiguration: TestConfiguration) => {
    this.logger.info('Setting up wallet');
    this.wallet = await this.buildWalletAndWaitForFunds(testConfiguration.dappConfig, testConfiguration.seed);
    expect(this.wallet).not.toBeNull();
    const state = await Rx.firstValueFrom(this.wallet.state());
    expect(state.balances[nativeToken()].valueOf()).toBeGreaterThan(BigInt(0));
    return this.wallet;
  };

  waitForFunds = (wallet: Wallet) =>
    Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.throttleTime(10_000),
        Rx.tap((state) => {
          const scanned = state.syncProgress?.synced ?? 0n;
          const total = state.syncProgress?.total.toString() ?? 'unknown number';
          this.logger.info(
            `Wallet scanned ${scanned} blocks out of ${total}, transactions=${state.transactionHistory.length}`,
          );
        }),
        Rx.filter((state) => {
          // Let's allow progress only if wallet is close enough
          const synced = state.syncProgress?.synced ?? 0n;
          const total = state.syncProgress?.total ?? 1_000n;
          return total - synced < 100n;
        }),
        Rx.map((s) => s.balances[nativeToken()] ?? 0n),
        Rx.filter((balance) => balance > 0n),
      ),
    );

  buildWalletAndWaitForFunds = async (
    { indexer, indexerWS, node, proofServer }: Config,
    seed: string,
  ): Promise<Wallet & Resource> => {
    const wallet = await WalletBuilder.buildFromSeed(
      indexer,
      indexerWS,
      proofServer,
      node,
      seed,
      getZswapNetworkId(),
      'warn',
    );
    wallet.start();
    const state = await Rx.firstValueFrom(wallet.state());
    this.logger.info(`Your wallet seed is: ${seed}`);
    this.logger.info(`Your wallet address is: ${state.address}`);
    let balance = state.balances[nativeToken()];
    if (balance === undefined || balance === 0n) {
      this.logger.info(`Your wallet balance is: 0`);
      this.logger.info(`Waiting to receive tokens...`);
      balance = await this.waitForFunds(wallet);
    }
    this.logger.info(`Your wallet balance is: ${balance}`);
    return wallet;
  };

  close = async () => {
    if (this.wallet !== undefined) {
      await this.wallet.close();
    }
  };
}

export class TestProviders {
  createWalletAndMidnightProvider = async (wallet: Wallet): Promise<WalletProvider & MidnightProvider> => {
    const state = await Rx.firstValueFrom(wallet.state());
    return {
      coinPublicKey: state.coinPublicKey,
      balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
        return wallet
          .balanceTransaction(
            ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
            newCoins,
          )
          .then((tx) => wallet.proveTransaction(tx))
          .then((zswapTx) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
          .then(createBalancedTx);
      },
      submitTx(tx: BalancedTransaction): Promise<TransactionId> {
        return wallet.submitTransaction(tx);
      },
    };
  };

  configureBattleshipProviders = async (wallet: Wallet & Resource, config: Config) => {
    const walletAndMidnightProvider = await this.createWalletAndMidnightProvider(wallet);
    const inMemory = inMemoryPrivateStateProvider<BattleshipPrivateStates>();
    return {
      privateStateProvider: inMemory,
      publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
      zkConfigProvider: new NodeZkConfigProvider<'join_p1' | 'join_p2' | 'turn_player2' | 'turn_player1'>(
        config.battleshipZkConfigPath,
      ),
      proofProvider: httpClientProofProvider(config.proofServer),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider,
    };
  };

  configureBrickTowersTokenProviders = async (wallet: Wallet & Resource, config: Config) => {
    const walletAndMidnightProvider = await this.createWalletAndMidnightProvider(wallet);
    const inMemory = inMemoryPrivateStateProvider<BrickTowersCoinPrivateStates>();
    return {
      privateStateProvider: inMemory,
      publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
      zkConfigProvider: new NodeZkConfigProvider<'mint'>(config.tokenZkConfigPath),
      proofProvider: httpClientProofProvider(config.proofServer),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider,
    };
  };
}
