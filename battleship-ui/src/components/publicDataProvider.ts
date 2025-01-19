import type {
  BlockHashConfig,
  BlockHeightConfig,
  ContractStateObservableConfig,
  FinalizedTxData,
  PublicDataProvider,
} from '@midnight-ntwrk/midnight-js-types';
import type { Logger } from 'pino';
import type { ContractAddress, ContractState } from '@midnight-ntwrk/compact-runtime';
import { retryWithBackoff } from './retryWithBackoff';
import type { TransactionId, ZswapChainState } from '@midnight-ntwrk/ledger';
import type { Observable } from 'rxjs';

export class WrappedPublicDataProvider implements PublicDataProvider {
  constructor(
    private readonly wrapped: PublicDataProvider,
    private readonly callback: (action: 'watchForTxDataStarted' | 'watchForTxDataDone') => void,
    private readonly logger: Logger,
  ) {}

  queryContractState(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig,
  ): Promise<ContractState | null> {
    return retryWithBackoff(
      () => this.wrapped.queryContractState(contractAddress, config),
      'queryContractState',
      this.logger,
    );
  }

  queryZSwapAndContractState(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig,
  ): Promise<[ZswapChainState, ContractState] | null> {
    return retryWithBackoff(
      () => this.wrapped.queryZSwapAndContractState(contractAddress, config),
      'queryZSwapAndContractState',
      this.logger,
    );
  }

  queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null> {
    return retryWithBackoff(
      () => this.wrapped.queryDeployContractState(contractAddress),
      'queryDeployContractState',
      this.logger,
    );
  }

  watchForContractState(contractAddress: ContractAddress): Promise<ContractState> {
    return retryWithBackoff(
      () => this.wrapped.watchForContractState(contractAddress),
      'watchForContractState',
      this.logger,
    );
  }

  watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
    return retryWithBackoff(
      () => this.wrapped.watchForDeployTxData(contractAddress),
      'watchForDeployTxData',
      this.logger,
    );
  }

  watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
    // calling a callback is a workaround to show in the UI when the watchForTxData is called
    this.callback('watchForTxDataStarted');
    return retryWithBackoff(
      () => this.wrapped.watchForTxData(txId),
      'watchForTxDataStarted',
      this.logger,
      1000, // we keep retrying long enough
    ).finally(() => {
      this.callback('watchForTxDataDone');
    });
  }

  contractStateObservable(address: ContractAddress, config: ContractStateObservableConfig): Observable<ContractState> {
    return this.wrapped.contractStateObservable(address, config);
  }
}
