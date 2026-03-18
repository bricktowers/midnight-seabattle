import {
  type PrivateStateProvider,
  type ExportPrivateStatesOptions,
  type ImportPrivateStatesOptions,
  type ImportPrivateStatesResult,
  type PrivateStateExport,
  type ExportSigningKeysOptions,
  type ImportSigningKeysOptions,
  type ImportSigningKeysResult,
  type SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types';
import type { ContractAddress, SigningKey } from '@midnight-ntwrk/compact-runtime';

/**
 * A simple in-memory implementation of private state provider. Makes it easy to capture and rewrite private state from deploy
 */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
export function inMemoryPrivateStateProvider<PSI extends string = string, PS = any>(): PrivateStateProvider<PSI, PS> {
  const btStateStore = new Map<PSI, PS>();
  const btSigningKeys = new Map<ContractAddress, SigningKey>();

  return {
    async set(privateStateId: PSI, state: PS): Promise<void> {
      btStateStore.set(privateStateId, state);
    },

    async get(privateStateId: PSI): Promise<PS | null> {
      return btStateStore.has(privateStateId) ? btStateStore.get(privateStateId)! : null;
    },

    async remove(privateStateId: PSI): Promise<void> {
      btStateStore.delete(privateStateId);
    },

    async clear(): Promise<void> {
      btStateStore.clear();
    },

    async setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      btSigningKeys.set(address, signingKey);
    },

    async getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      return btSigningKeys.has(address) ? btSigningKeys.get(address)! : null;
    },

    async removeSigningKey(address: ContractAddress): Promise<void> {
      btSigningKeys.delete(address);
    },

    async clearSigningKeys(): Promise<void> {
      btSigningKeys.clear();
    },

    setContractAddress(_address: ContractAddress): void {},

    async exportPrivateStates(_options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      return Promise.reject(new Error('exportPrivateStates not supported'));
    },

    async importPrivateStates(
      _exportData: PrivateStateExport,
      _options?: ImportPrivateStatesOptions,
    ): Promise<ImportPrivateStatesResult> {
      return Promise.reject(new Error('importPrivateStates not supported'));
    },

    async exportSigningKeys(_options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      return Promise.reject(new Error('exportSigningKeys not supported'));
    },

    async importSigningKeys(
      _exportData: SigningKeyExport,
      _options?: ImportSigningKeysOptions,
    ): Promise<ImportSigningKeysResult> {
      return Promise.reject(new Error('importSigningKeys not supported'));
    },
  };
}
