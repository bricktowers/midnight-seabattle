import { concatMap, from, mergeMap, retry } from 'rxjs';
import { type Config } from './common-types';
import { type BattleshipStateStream, BattleshipStateStreamImpl } from './battleship-state-stream';
import { FirestoreStorage, type IndexStorage } from './storage';
import type { BattleshipContract } from '@bricktowers/battleship-api';
import { Contract, westWitnesses } from '@bricktowers/battleship-west-contract';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import type { VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { getImpureCircuitIds } from '@midnight-ntwrk/midnight-js-contracts';

async function runIndex(config: Config, storage: IndexStorage) {
  const battleshipContract: BattleshipContract = new Contract(westWitnesses);
  const zkConfigProvider = new NodeZkConfigProvider<'join_p1' | 'join_p2' | 'turn_player2' | 'turn_player1'>('dist/');
  const verifierKeys: Array<['join_p1' | 'join_p2' | 'turn_player2' | 'turn_player1', VerifierKey]> =
    await zkConfigProvider.getVerifierKeys(getImpureCircuitIds(battleshipContract));

  const battleshipStateStream: BattleshipStateStream = new BattleshipStateStreamImpl(config, verifierKeys);

  const stream = from(storage.getBlockHeight()).pipe(
    concatMap((blockHeightOpt) => {
      const blockHeight = blockHeightOpt ?? 0;
      console.log('Starting from block height:', blockHeight);
      return battleshipStateStream.contractUpdateStateStream(blockHeight);
    }),
    retry({
      count: 10,
      delay: 500,
      resetOnSuccess: true,
    }),
    mergeMap(async (element) => {
      await Promise.all(element.contracts.map((contract) => storage.saveContract(contract)));
      return element;
    }),
    mergeMap(async (element) => {
      if (element.height % 100 === 0 || element.contracts.length > 0) {
        // save each 100th block height or if there are contracts in the block
        await storage.saveBlockHeight(element.height);
        console.log('Saved block with height:', element.height);
      }
      return element;
    }, 1), // concurrency is set to 1 to serialize the updates
  );

  return stream.subscribe({
    next: (element) => {},
    error: (err) => {
      console.error('Subscription error:', err);
    },
  });
}

const main = (): void => {
  try {
    console.log('Starting Battleship Indexer');

    const config: Config = {
      indexerUri: process.env.INDEXER_URI ?? 'http://localhost:8088/api/v1/graphql',
      indexerWsUri: process.env.INDEXER_WS_URI ?? 'ws://localhost:8088/api/v1/graphql/ws',
      projectId: process.env.PROJECT_ID ?? 'btow-playground',
      networkId: process.env.NETWORK_ID ?? 'Undeployed',
      rewardTokenAddress:
        process.env.REWARD_TOKEN_ADDRESS ?? '02008ecdaec43a0ef46e888cc3a59d8fb524eba66f942c41d3add165de34df364b53',
    };

    console.log('Config', config);

    const storage: IndexStorage = new FirestoreStorage(config.projectId, config.networkId);

    runIndex(config, storage)
      .then((subscription) => {
        console.log('Subscription created successfully:', subscription);
      })
      .catch((error) => {
        console.error('Error handling promise of subscription:', error);
        throw error;
      });
  } catch (e) {
    console.error('Error starting Battleship Indexer:', e);
  }
};

main();
