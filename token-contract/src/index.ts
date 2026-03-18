import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Contract } from './managed/token/contract/index.js';

export * from './managed/token/contract/index.js';

export const compiledTokenContract = CompiledContract.make<Contract>(
  'token',
  Contract,
).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets('./managed/token'),
);
