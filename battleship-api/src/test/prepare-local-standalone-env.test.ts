import { webcrypto } from 'crypto';
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

// @ts-expect-error It is required
globalThis.crypto = webcrypto;

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
    privateStateKey: 'coin',
    contract: brickTowersCoinContract,
    initialPrivateState: {},
    args: [randomBytes(32)],
  });
  console.log('deployed at', deployedContract.deployTxData.public.contractAddress);
}

test('prepare local env', async () => {
  // fund my wallets
  await sendNativeToken(
    '61827006f7a94be899b6c082fa562dea091a2c7b16c20995f2d0aea090265885|03009783460a73d913de64525ad88f51d627446e0d8304b4e75f806c554b31918b90518922d4aebd9efab1ded30891ea8aab24774db4f796aa1e',
    10000000000n,
  );

  await sendNativeToken(
    '82c96644c820c00b0dea3b61d24d1098cddd9ebfc8da439d74d78712c18c5660|030015f11ca8e8b66e8aead29974c43d34c778b3df5baa8b805f51e7d7c1e71d20b691a7787fc33d9f2199bcc5913f57877e4dfc5340c38c0806',
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
