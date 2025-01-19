import {
  type PrivateStateProvider,
  type PrivateStateSchema,
  type PrivateStateKey,
} from '@midnight-ntwrk/midnight-js-types';
import type { ContractAddress } from '@midnight-ntwrk/ledger';
import type { SigningKey } from '@midnight-ntwrk/compact-runtime';

/**
 * A simple in-memory implementation of private state provider. Makes it easy to capture and rewrite private state from deploy
 */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
export const inMemoryPrivateStateProvider = <PSS extends PrivateStateSchema>(): PrivateStateProvider<PSS> => {
  const record: PSS = {} as PSS;
  const signingKeys = {} as Record<ContractAddress, SigningKey>;
  return {
    set<PSK extends PrivateStateKey<PSS>>(key: PSK, state: PSS[PSK]): Promise<void> {
      record[key] = state;
      return Promise.resolve();
    },
    get<PSK extends PrivateStateKey<PSS>>(key: PSK): Promise<PSS[PSK] | null> {
      const value = record[key] ?? null;
      return Promise.resolve(value);
    },
    remove<PSK extends PrivateStateKey<PSS>>(key: PSK): Promise<void> {
      delete record[key];
      return Promise.resolve();
    },
    clear(): Promise<void> {
      Object.keys(record).forEach((key) => {
        delete record[key];
      });
      return Promise.resolve();
    },
    setSigningKey(contractAddress: ContractAddress, signingKey: SigningKey): Promise<void> {
      signingKeys[contractAddress] = signingKey;
      return Promise.resolve();
    },
    getSigningKey(contractAddress: ContractAddress): Promise<SigningKey | null> {
      const value = signingKeys[contractAddress] ?? null;
      return Promise.resolve(value);
    },
    removeSigningKey(contractAddress: ContractAddress): Promise<void> {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete signingKeys[contractAddress];
      return Promise.resolve();
    },
    clearSigningKeys(): Promise<void> {
      Object.keys(signingKeys).forEach((contractAddress) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete signingKeys[contractAddress];
      });
      return Promise.resolve();
    },
  };
};
