import { type SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { PrivateStateId, PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';
import type { Logger } from 'pino';

export class WrappedPrivateStateProvider<PSI extends PrivateStateId = PrivateStateId, PS = any>
  implements PrivateStateProvider<PSI, PS>
{
  constructor(
    private readonly privateDataProvider: PrivateStateProvider<PSI, PS>,
    private readonly logger: Logger,
  ) {}

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

  setSigningKey(key: PSI, signingKey: SigningKey): Promise<void> {
    this.logger.trace(`Setting signing key for key: ${key}`);
    return this.privateDataProvider.setSigningKey(key, signingKey);
  }

  getSigningKey(key: PSI): Promise<SigningKey | null> {
    this.logger.trace(`Getting signing key for key: ${key}`);
    return this.privateDataProvider.getSigningKey(key);
  }

  removeSigningKey(key: PSI): Promise<void> {
    this.logger.trace(`Removing signing key for key: ${key}`);
    return this.privateDataProvider.removeSigningKey(key);
  }

  clearSigningKeys(): Promise<void> {
    this.logger.trace('Clearing signing keys');
    return this.privateDataProvider.clearSigningKeys();
  }
}
