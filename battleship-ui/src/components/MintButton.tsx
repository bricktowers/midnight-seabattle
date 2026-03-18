import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { type ProviderCallbackAction, useMidnightWallet, type WalletAPI } from './MidnightWallet';
import { deployContract, findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { compiledTokenContract, type Contract, type Witnesses } from '@bricktowers/token-contract';
import {
  type MidnightProviders,
  type PrivateStateProvider,
  type ProofProvider,
  type PublicDataProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { localStoragePrivateStateProvider } from './localStoragePrivateStateProvider';
import type { WalletProvider } from '@midnight-ntwrk/midnight-js-types/dist/wallet-provider';
import type { MidnightProvider } from '@midnight-ntwrk/midnight-js-types/dist/midnight-provider';
import { proofClient } from './proofClient';
import { useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import type { Logger } from 'pino';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { CachedFetchZkConfigProvider } from './zkConfigProvider';
import * as utils from '@bricktowers/battleship-api/dist/utils';
import { encodeRawTokenType, rawTokenType } from '@midnight-ntwrk/compact-runtime';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface BrickTowersCoinPrivateState {}

type BrickTowersCoinContract = Contract<BrickTowersCoinPrivateState, Witnesses<BrickTowersCoinPrivateState>>;
type BrickTowersCoinCircuitKeys = Exclude<keyof BrickTowersCoinContract['impureCircuits'], number | symbol>;
type BrickTowersCoinProviders = MidnightProviders<BrickTowersCoinCircuitKeys, string, BrickTowersCoinPrivateState>;
type DeployedBrickTowersCoin = FoundContract<BrickTowersCoinContract>;

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

const providers: (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
) => BrickTowersCoinProviders = (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
) => {
  const privateStateProvider: PrivateStateProvider<string, BrickTowersCoinPrivateState> = localStoragePrivateStateProvider('bricktowerscoin-private-state');
  const zkConfigProvider = new CachedFetchZkConfigProvider<BrickTowersCoinCircuitKeys>(
    window.location.origin,
    fetch.bind(window),
    callback,
  );
  const proofProvider: ProofProvider = proofClient(
    walletAPI.proverServerUri ?? '',
    zkConfigProvider,
    callback,
  );
  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};

export interface MintButtonProps {
  logger: Logger;
  onMintTransaction: (success: boolean) => void;
}

export const MintButton: React.FC<MintButtonProps> = ({ logger, onMintTransaction }) => {
  const midnightWallet = useMidnightWallet();
  const config = useRuntimeConfiguration();
  const [minting, setMinting] = React.useState(false);
  const [contractAddress, setContractAddress] = React.useState<string | undefined>(config.BRICK_TOWERS_TOKEN_ADDRESS);
  const onMint: () => Promise<void> = async () => {
    if (!midnightWallet.isConnected) {
      midnightWallet.shake();
      return;
    }
    setMinting(true);
    try {
      if (midnightWallet.walletAPI) {
        const midnightProviders = providers(
          midnightWallet.publicDataProvider,
          midnightWallet.walletProvider,
          midnightWallet.midnightProvider,
          midnightWallet.walletAPI,
          midnightWallet.callback,
        );
        await midnightProviders.privateStateProvider.set('coin', {});
        const found = await findDeployedContract(midnightProviders, {
          compiledContract: compiledTokenContract,
          privateStateId: 'coin',
          contractAddress: contractAddress ?? config.BRICK_TOWERS_TOKEN_ADDRESS ?? '',
        });
        await found.callTx.mint();
        onMintTransaction(true);
      }
    } catch (e) {
      logger.error(e, 'Failed to mint BTC');
      onMintTransaction(false);
    } finally {
      setMinting(false);
    }
  };
  const onDeploy: () => Promise<void> = async () => {
    if (!midnightWallet.isConnected) {
      midnightWallet.shake();
      return;
    }
    setMinting(true);
    try {
      if (midnightWallet.walletAPI) {
        const midnightProviders = providers(
          midnightWallet.publicDataProvider,
          midnightWallet.walletProvider,
          midnightWallet.midnightProvider,
          midnightWallet.walletAPI,
          midnightWallet.callback,
        );
        await midnightProviders.privateStateProvider.set('coin', {});
        const deployedContract: DeployedBrickTowersCoin = await deployContract(midnightProviders, {
          compiledContract: compiledTokenContract,
          privateStateId: 'coin',
          initialPrivateState: {},
          args: [randomBytes(32)],
        });
        setContractAddress(deployedContract.deployTxData.public.contractAddress);
        logger.info('deployed at', deployedContract.deployTxData.public.contractAddress);
        onMintTransaction(true);
      }
    } catch (e) {
      logger.error(e, 'Failed to Deploy');
      onMintTransaction(false);
    } finally {
      setMinting(false);
    }
  };

  const onBoarding: () => Promise<void> = async () => {
    if (!midnightWallet.isConnected) {
      midnightWallet.shake();
      return;
    }
    setMinting(true);
    try {
      if (midnightWallet.walletAPI) {
        const midnightProviders = providers(
          midnightWallet.publicDataProvider,
          midnightWallet.walletProvider,
          midnightWallet.midnightProvider,
          midnightWallet.walletAPI,
          midnightWallet.callback,
        );
        await midnightProviders.privateStateProvider.set('coin', {});
        const actualAddress = contractAddress ?? config.BRICK_TOWERS_TOKEN_ADDRESS ?? '';
        const found = await findDeployedContract(midnightProviders, {
          compiledContract: compiledTokenContract,
          privateStateId: 'coin',
          contractAddress: actualAddress,
        });
        const coin = {
          nonce: utils.randomBytes(32),
          color: encodeRawTokenType(rawTokenType(utils.pad('brick_towers_coin', 32), actualAddress)),
          value: 1000n,
        };
        await (found.callTx as any).onboard(coin);
        onMintTransaction(true);
      }
    } catch (e) {
      logger.error(e, 'Failed to Deploy');
      onMintTransaction(false);
    } finally {
      setMinting(false);
    }
  };


  return (
    <>
      <Button onClick={onBoarding} disabled={minting}>
        Onboarding
      </Button>
      <Button onClick={onDeploy} disabled={minting}>
        Deploy
      </Button>
      <Button
        sx={{ marginRight: '30px', textTransform: 'none' }}
        size="small"
        variant={'outlined'}
        onClick={onMint}
        disabled={minting}
        startIcon={minting ? <CircularProgress size={16} /> : <AttachMoneyIcon />}
      >
        MINT ME tBTC + {contractAddress?.slice(0, 6) ?? 'not deployed'}
      </Button>
    </>
  );
};
