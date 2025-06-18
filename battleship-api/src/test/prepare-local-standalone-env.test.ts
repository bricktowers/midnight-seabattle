import { test, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { currentDir } from './config';
import { createLogger } from './logger-utils';
import {
  type BrickTowersCoinContract,
  type BrickTowersCoinProviders,
  type TestConfiguration,
  TestEnvironment,
  TestProviders,
} from './commons';
import { nativeToken } from '@midnight-ntwrk/ledger';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import type { Resource } from '@midnight-ntwrk/wallet';
import { Contract } from '@bricktowers/token-contract';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { randomBytes } from '../utils';

const logDir = path.resolve(currentDir, '..', 'logs', 'tests', `${new Date().toISOString()}.log`);
const logger = await createLogger(logDir);

globalThis.WebSocket = WebSocket;

let testEnvironment: TestEnvironment;
let testConfiguration: TestConfiguration;
let wallet: Wallet & Resource;

beforeAll(async () => {
  testEnvironment = new TestEnvironment(logger);
  testConfiguration = await testEnvironment.start();
  wallet = await testEnvironment.getWallet1();
}, 10 * 60_000);

afterAll(async () => {
  try {
    await testEnvironment.shutdown();
  } catch (e) {
    // ignore
  }
});

async function sendNativeToken(address: string, amount: bigint): Promise<string> {
  const transferRecipe = await wallet.transferTransaction([
    {
      amount,
      receiverAddress: address,
      type: nativeToken(),
    },
  ]);
  const transaction = await wallet.proveTransaction(transferRecipe);
  return await wallet.submitTransaction(transaction);
}

async function deployBrickTowersCoinContract(tokenProvider: BrickTowersCoinProviders) {
  const brickTowersCoinContract: BrickTowersCoinContract = new Contract({});
  const deployedContract = await deployContract(tokenProvider, {
    privateStateId: 'coin',
    contract: brickTowersCoinContract,
    initialPrivateState: {},
    args: [randomBytes(32)],
  });
  console.log('deployed at', deployedContract.deployTxData.public.contractAddress);
}

test('prepare local env', async () => {
  // fund my wallets
  await sendNativeToken(
    'mn_shield-addr_undeployed1025szwprcq8xyp7c3zmaqw9s6ven2jfdhsuuc5v6rv4x86swhl2qxq98905jzxdemzap89w8uka8rnjm8t7dsl5tpehwme22zh7se52j8qthdhd7',
    10000000000n,
  );

  // deploy brick towers coin contract required for battleship games.
  const tokenProvider = await new TestProviders().configureBrickTowersTokenProviders(
    wallet,
    testConfiguration.dappConfig,
  );
  await deployBrickTowersCoinContract(tokenProvider);

  await wallet.close();
});
