import type { ProofProvider } from '@midnight-ntwrk/midnight-js-types';
import type { UnprovenTransaction } from '@midnight-ntwrk/ledger-v8';
import type { ProveTxConfig } from '@midnight-ntwrk/midnight-js-types/dist/proof-provider';
import type { ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

export const proofClient = <K extends string>(
  url: string,
  zkConfigProvider: ZKConfigProvider<K>,
  callback: (status: 'proveTxStarted' | 'proveTxDone') => void,
): ProofProvider => {
  const httpClientProvider = httpClientProofProvider(url.trim(), zkConfigProvider);
  return {
    proveTx(tx: UnprovenTransaction, proveTxConfig?: ProveTxConfig): Promise<any> {
      // eslint-disable-next-line n/no-callback-literal
      callback('proveTxStarted');
      return httpClientProvider.proveTx(tx, proveTxConfig).finally(() => {
        // eslint-disable-next-line n/no-callback-literal
        callback('proveTxDone');
      });
    },
  };
};

export const noopProofClient = (): ProofProvider => {
  return {
    proveTx(_tx: UnprovenTransaction, _proveTxConfig?: ProveTxConfig): Promise<any> {
      return Promise.reject(new Error('Proof server not available'));
    },
  };
};
