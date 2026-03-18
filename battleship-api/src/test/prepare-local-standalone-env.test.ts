import { test, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { currentDir } from './config';
import { createLogger } from './logger-utils';
import {
  type BrickTowersCoinProviders,
  type TestConfiguration,
  TestEnvironment,
  TestProviders,
} from './commons';
import { nativeToken } from '@midnight-ntwrk/ledger-v8';
import { type MidnightWalletProvider } from '@midnight-ntwrk/testkit-js';
import { compiledTokenContract } from '@bricktowers/token-contract';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { randomBytes } from '../utils';
import { ShieldedAddress, MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';

const logDir = path.resolve(currentDir, '..', 'logs', 'tests', `${new Date().toISOString()}.log`);
const logger = await createLogger(logDir);

globalThis.WebSocket = WebSocket;

let testEnvironment: TestEnvironment;
let testConfiguration: TestConfiguration;
let wallet: MidnightWalletProvider;

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
  const shieldedAddress = ShieldedAddress.codec.decode('undeployed', MidnightBech32m.parse(address));
  const recipe = await wallet.wallet.transferTransaction(
    [{ type: 'shielded', outputs: [{ type: nativeToken().raw, receiverAddress: shieldedAddress, amount }] }],
    { shieldedSecretKeys: wallet.zswapSecretKeys, dustSecretKey: wallet.dustSecretKey },
    { ttl: ttlOneHour() },
  );
  const finalized = await wallet.wallet.finalizeRecipe(recipe);
  return await wallet.wallet.submitTransaction(finalized);
}

async function deployBrickTowersCoinContract(tokenProvider: BrickTowersCoinProviders) {
  const deployedContract = await deployContract(tokenProvider, {
    compiledContract: compiledTokenContract,
    privateStateId: 'coin',
    initialPrivateState: {},
    args: [randomBytes(32)],
  });
  console.log('deployed at', deployedContract.deployTxData.public.contractAddress);
}

test('prepare local env', async () => {
  // fund my wallets
  await sendNativeToken(
    'mn_shield-addr_undeployed1598u6za3mwq6f7t8y2nhdjjpphrj5wd8kqup0ek9zunwdm23u4gqxqpflrd9742ewc2r50894hracp4mnw6e5qp4t44vhz2vwsdppgtzugrj0zfu',
    1000000000000n,
  );

  // deploy brick towers coin contract required for battleship games.
  const tokenProvider = await new TestProviders().configureBrickTowersTokenProviders(
    wallet,
    testConfiguration.dappConfig,
  );
  await deployBrickTowersCoinContract(tokenProvider);

  await wallet.stop();
});
