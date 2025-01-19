import path from 'node:path';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

export interface Config {
  readonly privateStateStoreName: string;
  readonly logDir: string;
  readonly battleshipZkConfigPath: string;
  readonly tokenZkConfigPath: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
}

export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

export class StandaloneConfig implements Config {
  privateStateStoreName = 'battleship-private-state';
  logDir = path.resolve(currentDir, '..', 'logs', 'standalone', `${new Date().toISOString()}.log`);
  battleshipZkConfigPath = path.resolve(
    currentDir,
    '..',
    '..',
    '..',
    'battleship-west-contract',
    'dist',
    'managed',
    'battleship_west',
  );

  tokenZkConfigPath = path.resolve(currentDir, '..', '..', '..', 'token-contract', 'dist', 'managed', 'token');
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';

  constructor() {
    setNetworkId(NetworkId.Undeployed);
  }
}

export class TestnetRemoteConfig implements Config {
  privateStateStoreName = 'battleship-private-state';
  logDir = path.resolve(currentDir, '..', 'logs', 'testnet-remote', `${new Date().toISOString()}.log`);
  battleshipZkConfigPath = path.resolve(
    currentDir,
    '..',
    '..',
    '..',
    'battleship-west-contract',
    'dist',
    'managed',
    'battleship_west',
  );

  tokenZkConfigPath = path.resolve(currentDir, '..', '..', '..', 'token-contract', 'dist', 'managed', 'token');
  indexer = 'https://indexer.testnet.midnight.network/api/v1/graphql';
  indexerWS = 'wss://indexer.testnet.midnight.network/api/v1/graphql/ws';
  node = 'https://rpc.testnet.midnight.network';
  proofServer = 'http://127.0.0.1:6300';

  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}
