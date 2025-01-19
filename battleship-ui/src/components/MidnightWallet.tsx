import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Logger } from 'pino';
import { type Address, type CoinPublicKey } from '@midnight-ntwrk/wallet-api/dist/types';
import {
  type BattleshipCircuitKeys,
  type BattleshipPrivateStates,
  type BattleshipProviders,
} from '@bricktowers/battleship-api';
import {
  type BalancedTransaction,
  createBalancedTx,
  type PrivateStateProvider,
  type ProofProvider,
  type PublicDataProvider,
  type UnbalancedTransaction,
} from '@midnight-ntwrk/midnight-js-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { type CoinInfo, Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import type { DAppConnectorWalletAPI, ServiceUriConfig } from '@midnight-ntwrk/dapp-connector-api';
import { useGameLocalState } from '../hooks/useGameLocalState';
import type { ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types/dist/zk-config-provider';
import type { WalletProvider } from '@midnight-ntwrk/midnight-js-types/dist/wallet-provider';
import type { MidnightProvider } from '@midnight-ntwrk/midnight-js-types/dist/midnight-provider';
import { MidnightWalletErrorType, WalletWidget } from './WalletWidget';
import { connectToWallet } from './connectToWallet';
import { noopProofClient, proofClient } from './proofClient';
import { WrappedPublicDataProvider } from './publicDataProvider';
import { WrappedPrivateStateProvider } from './privateStateProvider';
import { CachedFetchZkConfigProvider } from './zkConfigProvider';

function isChromeBrowser(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('chrome') && !userAgent.includes('edge') && !userAgent.includes('opr');
}

interface MidnightWalletState {
  isConnected: boolean;
  proofServerIsOnline: boolean;
  address?: Address;
  widget?: React.ReactNode;
  walletAPI?: WalletAPI;
  privateStateProvider: PrivateStateProvider<BattleshipPrivateStates>;
  zkConfigProvider: ZKConfigProvider<BattleshipCircuitKeys>;
  proofProvider: ProofProvider<BattleshipCircuitKeys>;
  publicDataProvider: PublicDataProvider;
  walletProvider: WalletProvider;
  midnightProvider: MidnightProvider;
  providers: BattleshipProviders;
  shake: () => void;
  callback: (action: ProviderCallbackAction) => void;
}

export interface WalletAPI {
  wallet: DAppConnectorWalletAPI;
  coinPublicKey: CoinPublicKey;
  uris: ServiceUriConfig;
}

export const getErrorType = (error: Error): MidnightWalletErrorType => {
  if (error.message.includes('Could not find Midnight Lace wallet')) {
    return MidnightWalletErrorType.WALLET_NOT_FOUND;
  }
  if (error.message.includes('Incompatible version of Midnight Lace wallet')) {
    return MidnightWalletErrorType.INCOMPATIBLE_API_VERSION;
  }
  if (error.message.includes('Wallet connector API has failed to respond')) {
    return MidnightWalletErrorType.TIMEOUT_API_RESPONSE;
  }
  if (error.message.includes('Could not find wallet connector API')) {
    return MidnightWalletErrorType.TIMEOUT_FINDING_API;
  }
  if (error.message.includes('Unable to enable connector API')) {
    return MidnightWalletErrorType.ENABLE_API_FAILED;
  }
  if (error.message.includes('Application is not authorized')) {
    return MidnightWalletErrorType.UNAUTHORIZED;
  }
  return MidnightWalletErrorType.UNKNOWN_ERROR;
};
const MidnightWalletContext = createContext<MidnightWalletState | null>(null);

export const useMidnightWallet = (): MidnightWalletState => {
  const walletState = useContext(MidnightWalletContext);
  if (!walletState) {
    throw new Error('MidnightWallet not loaded');
  }
  return walletState;
};

interface MidnightWalletProviderProps {
  children: React.ReactNode;
  logger: Logger;
}

export type ProviderCallbackAction =
  | 'downloadProverStarted'
  | 'downloadProverDone'
  | 'proveTxStarted'
  | 'proveTxDone'
  | 'balanceTxStarted'
  | 'balanceTxDone'
  | 'submitTxStarted'
  | 'submitTxDone'
  | 'watchForTxDataStarted'
  | 'watchForTxDataDone';

export const MidnightWalletProvider: React.FC<MidnightWalletProviderProps> = ({ logger, children }) => {
  const [isConnecting, setIsConnecting] = React.useState<boolean>(false);
  const [walletError, setWalletError] = React.useState<MidnightWalletErrorType | undefined>(undefined);
  const [address, setAddress] = React.useState<Address | undefined>(undefined);
  const [proofServerIsOnline, setProofServerIsOnline] = React.useState<boolean>(false);
  const config = useRuntimeConfiguration();
  const [openWallet, setOpenWallet] = React.useState(false);
  const [isRotate, setRotate] = React.useState(false);
  const localState = useGameLocalState();
  const [snackBarText, setSnackBarText] = useState<string | undefined>(undefined);
  const [walletAPI, setWalletAPI] = useState<WalletAPI | undefined>(undefined);
  const [floatingOpen, setFloatingOpen] = React.useState(true);

  const onMintTransaction = (success: boolean): void => {
    if (success) {
      setSnackBarText('Minting tBTC was successful');
    } else {
      setSnackBarText('Minting tBTC failed');
    }
    setTimeout(() => {
      setSnackBarText(undefined);
    }, 3000);
  };

  const privateStateProvider: PrivateStateProvider<BattleshipPrivateStates> = useMemo(
    () =>
      new WrappedPrivateStateProvider(
        levelPrivateStateProvider({
          privateStateStoreName: 'battleship-private-state',
        }),
        logger,
      ),
    [],
  );

  const providerCallback: (action: ProviderCallbackAction) => void = (action: ProviderCallbackAction): void => {
    if (action === 'proveTxStarted') {
      setSnackBarText('Proving transaction...');
    } else if (action === 'proveTxDone') {
      setSnackBarText(undefined);
    } else if (action === 'balanceTxStarted') {
      setSnackBarText('Signing the transaction with Midnight Lace wallet...');
    } else if (action === 'downloadProverDone') {
      setSnackBarText(undefined);
    } else if (action === 'downloadProverStarted') {
      setSnackBarText('Downloading prover key...');
    } else if (action === 'balanceTxDone') {
      setSnackBarText(undefined);
    } else if (action === 'submitTxStarted') {
      setSnackBarText('Submitting transaction...');
    } else if (action === 'submitTxDone') {
      setSnackBarText(undefined);
    } else if (action === 'watchForTxDataStarted') {
      setSnackBarText('Waiting for transaction finalization on blockchain...');
    } else if (action === 'watchForTxDataDone') {
      setSnackBarText(undefined);
    }
  };

  const zkConfigProvider = useMemo(
    () =>
      new CachedFetchZkConfigProvider<BattleshipCircuitKeys>(
        window.location.origin,
        fetch.bind(window),
        providerCallback,
      ),
    [],
  );

  const publicDataProvider = useMemo(
    () =>
      new WrappedPublicDataProvider(
        indexerPublicDataProvider(config.INDEXER_URI, config.INDEXER_WS_URI),
        providerCallback,
        logger,
      ),
    [],
  );

  function shake(): void {
    setRotate(true);
    setSnackBarText('Please connect to your Midnight Lace wallet');
    setTimeout(() => {
      setRotate(false);
      setSnackBarText(undefined);
    }, 3000);
  }

  const proofProvider = useMemo(() => {
    if (walletAPI) {
      return proofClient(walletAPI.uris.proverServerUri, providerCallback);
    } else {
      return noopProofClient();
    }
  }, [walletAPI]);

  const walletProvider: WalletProvider = useMemo(() => {
    if (walletAPI) {
      return {
        coinPublicKey: walletAPI.coinPublicKey,
        balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
          providerCallback('balanceTxStarted');
          return walletAPI.wallet
            .balanceAndProveTransaction(
              ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
              newCoins,
            )
            .then((zswapTx) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
            .then(createBalancedTx)
            .finally(() => {
              providerCallback('balanceTxDone');
            });
        },
      };
    } else {
      return {
        coinPublicKey: '',
        balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
          return Promise.reject(new Error('readonly'));
        },
      };
    }
  }, [walletAPI]);

  const midnightProvider: MidnightProvider = useMemo(() => {
    if (walletAPI) {
      return {
        submitTx(tx: BalancedTransaction): Promise<TransactionId> {
          providerCallback('submitTxStarted');
          return walletAPI.wallet.submitTransaction(tx).finally(() => {
            providerCallback('submitTxDone');
          });
        },
      };
    } else {
      return {
        submitTx(tx: BalancedTransaction): Promise<TransactionId> {
          return Promise.reject(new Error('readonly'));
        },
      };
    }
  }, [walletAPI]);

  const [walletState, setWalletState] = React.useState<MidnightWalletState>({
    isConnected: false,
    proofServerIsOnline: false,
    address: undefined,
    widget: undefined,
    walletAPI,
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    publicDataProvider,
    walletProvider,
    midnightProvider,
    shake,
    providers: {
      privateStateProvider,
      publicDataProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    },
    callback: providerCallback,
  });

  async function checkProofServerStatus(proverServerUri: string): Promise<void> {
    try {
      const response = await fetch(proverServerUri);
      if (!response.ok) {
        setProofServerIsOnline(false);
      }
      const text = await response.text();
      setProofServerIsOnline(text.includes("We're alive 🎉!"));
    } catch (error) {
      setProofServerIsOnline(false);
    }
  }

  async function connect(manual: boolean): Promise<void> {
    localState.setLaceAutoConnect(true);
    setIsConnecting(true);
    let walletResult;
    try {
      walletResult = await connectToWallet(logger);
    } catch (e) {
      const walletError = getErrorType(e as Error);
      setWalletError(walletError);
      setIsConnecting(false);
    }
    if (!walletResult) {
      setIsConnecting(false);
      if (manual) setOpenWallet(true);
      return;
    }
    await checkProofServerStatus(walletResult.uris.proverServerUri);
    try {
      const reqState = await walletResult.wallet.state();
      setAddress(reqState.address);
      setWalletAPI({
        wallet: walletResult.wallet,
        coinPublicKey: reqState.coinPublicKey,
        uris: walletResult.uris,
      });
    } catch (e) {
      setWalletError(MidnightWalletErrorType.TIMEOUT_API_RESPONSE);
    }
    setIsConnecting(false);
  }

  useEffect(() => {
    setWalletState((state) => ({
      ...state,
      walletAPI,
      privateStateProvider,
      zkConfigProvider,
      proofProvider,
      publicDataProvider,
      walletProvider,
      midnightProvider,
      providers: {
        privateStateProvider,
        publicDataProvider,
        zkConfigProvider,
        proofProvider,
        walletProvider,
        midnightProvider,
      },
    }));
  }, [
    walletAPI,
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    publicDataProvider,
    walletProvider,
    midnightProvider,
  ]);

  useEffect(() => {
    setWalletState((state) => ({
      ...state,
      isConnected: !!address,
      proofServerIsOnline,
      address,
      widget: WalletWidget(
        () => connect(true), // manual connect
        setOpenWallet,
        isRotate,
        openWallet,
        isChromeBrowser(),
        proofServerIsOnline,
        isConnecting,
        logger,
        onMintTransaction,
        floatingOpen,
        setFloatingOpen,
        walletError,
        snackBarText,
        address,
      ),
      shake,
    }));
  }, [isConnecting, walletError, address, openWallet, isRotate, proofServerIsOnline, snackBarText, floatingOpen]);

  useEffect(() => {
    if (!walletState.isConnected && !isConnecting && !walletError && localState.isLaceAutoConnect()) {
      void connect(false); // auto connect
    }
  }, [walletState.isConnected, isConnecting]);

  return <MidnightWalletContext.Provider value={walletState}>{children}</MidnightWalletContext.Provider>;
};
