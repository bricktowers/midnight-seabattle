import { type Config, currentDir, StandaloneConfig } from './config';
import { DockerComposeEnvironment, type StartedDockerComposeEnvironment, Wait } from 'testcontainers';
import path from 'path';
import type { Logger } from 'pino';
import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider';
import { type Contract, type Witnesses } from '@bricktowers/token-contract';
import type { FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type BattleshipPrivateState } from '@bricktowers/battleship-west-contract';
import { MidnightWalletProvider, type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';

export const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface BrickTowersCoinPrivateState {}
type BrickTowersCoinPrivateStates = Record<string, BrickTowersCoinPrivateState>;
type BrickTowersCoinCircuitKeys = Exclude<keyof BrickTowersCoinContract['impureCircuits'], number | symbol>;
export type BrickTowersCoinContract = Contract<BrickTowersCoinPrivateState, Witnesses<BrickTowersCoinPrivateState>>;
export type BrickTowersCoinProviders = MidnightProviders<
  BrickTowersCoinCircuitKeys,
  string,
  BrickTowersCoinPrivateState
>;
export type DeployedBrickTowersCoin = FoundContract<BrickTowersCoinContract>;

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

const toEnvironmentConfig = (config: Config): EnvironmentConfiguration => ({
  walletNetworkId: NetworkId.NetworkId.Undeployed,
  networkId: 'undeployed',
  indexer: config.indexer,
  indexerWS: config.indexerWS,
  node: config.node,
  nodeWS: config.node.replace(/^http/, 'ws'),
  proofServer: config.proofServer,
  faucet: undefined,
});

export class TestEnvironment {
  private readonly logger: Logger;
  private env: StartedDockerComposeEnvironment | undefined;
  private testConfig: TestConfiguration;
  private testWallet1: MidnightWalletProvider | undefined;
  private testWallet2: MidnightWalletProvider | undefined;

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
      const composeFile = process.env.COMPOSE_FILE ?? 'undeployed-compose.yml';
      this.logger.info(`Using compose file: ${composeFile}`);
      const dockerEnv = new DockerComposeEnvironment(path.resolve(currentDir, '..', '..', '..'), composeFile);
      this.env = await dockerEnv.up();

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

  shutdown = async () => {
    if (this.testWallet1 !== undefined) {
      await this.testWallet1.stop();
    }
    if (this.testWallet2 !== undefined) {
      await this.testWallet2.stop();
    }
    if (this.env !== undefined) {
      this.logger.info('Test containers closing');
      await this.env.down();
    }
  };

  getWallet1 = async (): Promise<MidnightWalletProvider> => {
    setNetworkId('undeployed');
    this.testWallet1 = await MidnightWalletProvider.build(
      this.logger,
      toEnvironmentConfig(this.testConfig.dappConfig),
      this.testConfig.seed,
    );
    await this.testWallet1.start(true);
    return this.testWallet1;
  };

  getWallet2 = async (): Promise<MidnightWalletProvider> => {
    setNetworkId('undeployed');
    this.testWallet2 = await MidnightWalletProvider.build(
      this.logger,
      toEnvironmentConfig(this.testConfig.dappConfig),
      this.testConfig.seed,
    );
    await this.testWallet2.start(true);
    return this.testWallet2;
  };
}

export class TestProviders {
  configureBattleshipProviders = async (wallet: MidnightWalletProvider, config: Config) => {
    const inMemory = inMemoryPrivateStateProvider<string, BattleshipPrivateState>();
    const zkConfigProvider = new NodeZkConfigProvider<'join_p1' | 'join_p2' | 'turn_player2' | 'turn_player1'>(
      config.battleshipZkConfigPath,
    );
    return {
      privateStateProvider: inMemory,
      publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
      walletProvider: wallet,
      midnightProvider: wallet,
    };
  };

  configureBrickTowersTokenProviders = async (wallet: MidnightWalletProvider, config: Config) => {
    const inMemory = inMemoryPrivateStateProvider<string, BrickTowersCoinPrivateStates>();
    const zkConfigProvider = new NodeZkConfigProvider<'mint'>(config.tokenZkConfigPath);
    return {
      privateStateProvider: inMemory,
      publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
      walletProvider: wallet,
      midnightProvider: wallet,
    };
  };
}
