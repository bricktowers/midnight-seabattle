import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { type ProviderCallbackAction, useMidnightWallet, type WalletAPI } from './MidnightWallet';
import { deployContract, findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { Contract, type Witnesses } from '@bricktowers/token-contract';
import {
  type MidnightProviders,
  type PrivateStateProvider,
  type PublicDataProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type { ProofProvider } from '@midnight-ntwrk/midnight-js-types/dist/proof-provider';
import type { WalletProvider } from '@midnight-ntwrk/midnight-js-types/dist/wallet-provider';
import type { MidnightProvider } from '@midnight-ntwrk/midnight-js-types/dist/midnight-provider';
import { proofClient } from './proofClient';
import { useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import type { Logger } from 'pino';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { CachedFetchZkConfigProvider } from './zkConfigProvider';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface BrickTowersCoinPrivateState {}

type BrickTowersCoinPrivateStates = Record<string, BrickTowersCoinPrivateState>;
type BrickTowersCoinContract = Contract<BrickTowersCoinPrivateState, Witnesses<BrickTowersCoinPrivateState>>;
type BrickTowersCoinCircuitKeys = Exclude<keyof BrickTowersCoinContract['impureCircuits'], number | symbol>;
type BrickTowersCoinProviders = MidnightProviders<BrickTowersCoinCircuitKeys, BrickTowersCoinPrivateStates>;
type DeployedBrickTowersCoin = FoundContract<BrickTowersCoinPrivateState, BrickTowersCoinContract>;

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
  const privateStateProvider: PrivateStateProvider<BrickTowersCoinPrivateStates> = levelPrivateStateProvider({
    privateStateStoreName: 'bricktowerscoin-private-state',
  });
  const proofProvider: ProofProvider<BrickTowersCoinCircuitKeys> = proofClient(
    walletAPI.uris.proverServerUri,
    callback,
  );
  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider: new CachedFetchZkConfigProvider<BrickTowersCoinCircuitKeys>(
      window.location.origin,
      fetch.bind(window),
      callback,
    ),
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
  const onMint: () => Promise<void> = async () => {
    if (!midnightWallet.isConnected) {
      midnightWallet.shake();
      return;
    }
    setMinting(true);
    try {
      const contract: BrickTowersCoinContract = new Contract({});
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
          privateStateKey: 'coin',
          contractAddress: config.BRICK_TOWERS_TOKEN_ADDRESS,
          contract,
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
      const contract: BrickTowersCoinContract = new Contract({});

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
          privateStateKey: 'coin',
          contract,
          initialPrivateState: {},
          args: [randomBytes(32)],
        });

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
  if (window.localStorage.getItem('brick_towers_deploy')) {
    // hidden button to deploy
    return (
      <Button onClick={onDeploy} disabled={minting}>
        Deploy
      </Button>
    );
  } else {
    return (
      <Button
        sx={{ marginRight: '30px', textTransform: 'none' }}
        size="small"
        variant={'outlined'}
        onClick={onMint}
        disabled={minting}
        startIcon={minting ? <CircularProgress size={16} /> : <AttachMoneyIcon />}
      >
        MINT ME tBTC
      </Button>
    );
  }
};
