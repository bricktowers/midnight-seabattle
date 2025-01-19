import type { GameContract } from '@bricktowers/battleship-api';
import type { ContractState } from '@midnight-ntwrk/ledger';

export type Config = {
  indexerUri: string;
  indexerWsUri: string;
  projectId: string;
  networkId: string;
  rewardTokenAddress: string;
};

export type Transaction = {
  hash: string;
  identifiers: string[];
  contractCalls: Array<{
    address: string;
    __typename: string;
  }>;
};

export type ContractStateUpdateBlock = {
  height: number;
  contracts: GameContract[];
};

export type ContractStateAddress = {
  address: string;
  state: ContractState;
};

export type StreamElementData = {
  blocks: {
    height: number;
    hash: string;
    transactions: Transaction[];
  };
};
