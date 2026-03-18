import path from 'node:path';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

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
  indexer = 'http://127.0.0.1:8088/api/v3/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v3/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';

  constructor() {
    setNetworkId('undeployed');
  }
}

