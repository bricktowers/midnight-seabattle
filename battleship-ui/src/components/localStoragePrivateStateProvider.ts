import type { SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { ContractAddress } from '@midnight-ntwrk/ledger-v8';
import type {
  ExportPrivateStatesOptions,
  ExportSigningKeysOptions,
  ImportPrivateStatesOptions,
  ImportPrivateStatesResult,
  ImportSigningKeysOptions,
  ImportSigningKeysResult,
  PrivateStateExport,
  PrivateStateId,
  PrivateStateProvider,
  SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types';

export const localStoragePrivateStateProvider = <PSI extends PrivateStateId, PS = unknown>(
  storeName: string,
): PrivateStateProvider<PSI, PS> => {
  let contractPrefix = '';

  const statesKey = (key: PSI): string => `${storeName}:${contractPrefix}:state:${key}`;
  const signingKey = (address: ContractAddress): string => `${storeName}:${contractPrefix}:signingKey:${address}`;

  return {
    setContractAddress(address: ContractAddress): void {
      contractPrefix = address;
    },

    set(key: PSI, state: PS): Promise<void> {
      localStorage.setItem(statesKey(key), JSON.stringify(state, (_k, v) => (typeof v === 'bigint' ? { __bigint: v.toString() } : v)));
      return Promise.resolve();
    },

    get(key: PSI): Promise<PS | null> {
      const item = localStorage.getItem(statesKey(key));
      if (item === null) return Promise.resolve(null);
      return Promise.resolve(JSON.parse(item, (_k, v) => (v && typeof v === 'object' && '__bigint' in v ? BigInt(v.__bigint) : v)) as PS);
    },

    remove(key: PSI): Promise<void> {
      localStorage.removeItem(statesKey(key));
      return Promise.resolve();
    },

    clear(): Promise<void> {
      const prefix = `${storeName}:${contractPrefix}:state:`;
      Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix))
        .forEach((k) => localStorage.removeItem(k));
      return Promise.resolve();
    },

    setSigningKey(address: ContractAddress, key: SigningKey): Promise<void> {
      localStorage.setItem(signingKey(address), key);
      return Promise.resolve();
    },

    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      const item = localStorage.getItem(signingKey(address));
      if (item === null) return Promise.resolve(null);
      return Promise.resolve(item as SigningKey);
    },

    removeSigningKey(address: ContractAddress): Promise<void> {
      localStorage.removeItem(signingKey(address));
      return Promise.resolve();
    },

    clearSigningKeys(): Promise<void> {
      const prefix = `${storeName}:${contractPrefix}:signingKey:`;
      Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix))
        .forEach((k) => localStorage.removeItem(k));
      return Promise.resolve();
    },

    exportPrivateStates(_options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      return Promise.reject(new Error('exportPrivateStates not supported'));
    },

    importPrivateStates(_exportData: PrivateStateExport, _options?: ImportPrivateStatesOptions): Promise<ImportPrivateStatesResult> {
      return Promise.reject(new Error('importPrivateStates not supported'));
    },

    exportSigningKeys(_options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      return Promise.reject(new Error('exportSigningKeys not supported'));
    },

    importSigningKeys(_exportData: SigningKeyExport, _options?: ImportSigningKeysOptions): Promise<ImportSigningKeysResult> {
      return Promise.reject(new Error('importSigningKeys not supported'));
    },
  };
};
