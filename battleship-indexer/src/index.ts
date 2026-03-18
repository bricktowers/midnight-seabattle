import { catchError, concatMap, from, mergeMap, retry, throwError } from 'rxjs';
import { type Config } from './common-types';
import { type BattleshipStateStream, BattleshipStateStreamImpl } from './battleship-state-stream';
import { FirestoreStorage, type IndexStorage } from './storage';
import type { BattleshipContract } from '@bricktowers/battleship-api';
import { Contract, westWitnesses } from '@bricktowers/battleship-west-contract';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import type { VerifierKey } from '@midnight-ntwrk/midnight-js-types';

type MyCircuits = 'join_p1' | 'join_p2' | 'turn_player2' | 'turn_player1';

async function runIndex(config: Config, storage: IndexStorage) {
  const battleshipContract: BattleshipContract = new Contract(westWitnesses);
  const zkConfigProvider = new NodeZkConfigProvider<MyCircuits>('dist/');
  const verifierKeys: Array<[MyCircuits, VerifierKey]> = await zkConfigProvider.getVerifierKeys(
    Object.keys(battleshipContract.impureCircuits) as MyCircuits[],
  );

  const battleshipStateStream: BattleshipStateStream = new BattleshipStateStreamImpl(config, verifierKeys);

  const stream = from(storage.getBlockHeight()).pipe(
    concatMap((blockHeightOpt) => {
      const blockHeight = blockHeightOpt ?? 0;
      console.log('Starting from block height:', blockHeight);
      return battleshipStateStream.contractUpdateStateStream(blockHeight);
    }),
    catchError((err, caught) => {
      console.error('Stream encountered an error before retry:', err);
      return throwError(() => err); // rethrow to trigger retry
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
      indexerUri: process.env.INDEXER_URI ?? 'https://indexer.preprod.midnight.network/api/v3/graphql',
      indexerWsUri: process.env.INDEXER_WS_URI ?? 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws',
      projectId: process.env.PROJECT_ID ?? 'btow-dev-midnight',
      networkId: process.env.NETWORK_ID ?? 'preprod',
      rewardTokenAddress:
        process.env.REWARD_TOKEN_ADDRESS ?? '0200e2f48cf74e64894297105ad968385d637cf4b6228042ea89a89452a497da3cf0',
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
