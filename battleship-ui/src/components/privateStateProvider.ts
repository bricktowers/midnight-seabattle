import { type SigningKey } from '@midnight-ntwrk/compact-runtime';
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
import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';
import type { Logger } from 'pino';

export class WrappedPrivateStateProvider<PSI extends PrivateStateId = PrivateStateId, PS = any>
  implements PrivateStateProvider<PSI, PS>
{
  constructor(
    private readonly privateDataProvider: PrivateStateProvider<PSI, PS>,
    private readonly logger: Logger,
  ) {}

  setContractAddress(address: ContractAddress): void {
    return this.privateDataProvider.setContractAddress(address);
  }

  set(key: PSI, state: PS): Promise<void> {
    this.logger.trace(`Setting private state for key: ${key}`);
    return this.privateDataProvider.set(key, state);
  }

  get(key: PSI): Promise<PS | null> {
    this.logger.trace(`Getting private state for key: ${key}`);
    return this.privateDataProvider.get(key);
  }

  remove(key: PSI): Promise<void> {
    this.logger.trace(`Removing private state for key: ${key}`);
    return this.privateDataProvider.remove(key);
  }

  clear(): Promise<void> {
    this.logger.trace('Clearing private state');
    return this.privateDataProvider.clear();
  }

  setSigningKey(key: ContractAddress, signingKey: SigningKey): Promise<void> {
    this.logger.trace(`Setting signing key for key: ${key}`);
    return this.privateDataProvider.setSigningKey(key, signingKey);
  }

  getSigningKey(key: ContractAddress): Promise<SigningKey | null> {
    this.logger.trace(`Getting signing key for key: ${key}`);
    return this.privateDataProvider.getSigningKey(key);
  }

  removeSigningKey(key: ContractAddress): Promise<void> {
    this.logger.trace(`Removing signing key for key: ${key}`);
    return this.privateDataProvider.removeSigningKey(key);
  }

  clearSigningKeys(): Promise<void> {
    this.logger.trace('Clearing signing keys');
    return this.privateDataProvider.clearSigningKeys();
  }

  exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
    return this.privateDataProvider.exportPrivateStates(options);
  }

  importPrivateStates(exportData: PrivateStateExport, options?: ImportPrivateStatesOptions): Promise<ImportPrivateStatesResult> {
    return this.privateDataProvider.importPrivateStates(exportData, options);
  }

  exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
    return this.privateDataProvider.exportSigningKeys(options);
  }

  importSigningKeys(exportData: SigningKeyExport, options?: ImportSigningKeysOptions): Promise<ImportSigningKeysResult> {
    return this.privateDataProvider.importSigningKeys(exportData, options);
  }
}
