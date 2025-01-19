import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CardActions, Grid, Snackbar, Typography } from '@mui/material';
import { Board } from './components';
import { useDeployedGameContext } from './hooks';
import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';
import './my-battles.css';
import { useMidnightWallet } from './components/MidnightWallet';
import CreateBoardIcon from '@mui/icons-material/AddCircleOutlined';
import JoinBoardIcon from '@mui/icons-material/AddLinkOutlined';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import { TextPromptDialog } from './components/TextPromptDialog';
import { useRuntimeConfiguration } from './config/RuntimeConfiguration';
import * as firebase from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
import { collection, getFirestore, onSnapshot } from 'firebase/firestore';
import { BattleshipAPI, type BattleshipProviders, type GameContract } from '@bricktowers/battleship-api';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { useGameLocalState } from './hooks/useGameLocalState';
import { type Game } from './contexts/BrowserDeployedGameManager';
import { GAME_STATE } from '@bricktowers/battleship-west-contract';
import type { Logger } from 'pino';
import { useNavigate } from 'react-router-dom';

export type MyBattlesProps = PropsWithChildren<{
  logger: Logger;
}>;

const MyBattles: React.FC<MyBattlesProps> = ({ logger }) => {
  const deployedGameAPIProvider = useDeployedGameContext();
  const midnightWallet = useMidnightWallet();
  const midnight = useMidnightWallet();
  const [gameDeploymentObservable, setGameDeploymentObservable] = useState<Game[]>([]);
  const config = useRuntimeConfiguration();
  const localState = useGameLocalState();
  const [snackBarOpen, setSnackBarOpen] = useState(false);
  const [snackBarText, setSnackBarText] = useState('');
  const firebaseConfig = {
    apiKey: config.FIREBASE_API_KEY,
    authDomain: config.FIREBASE_AUTH_DOMAIN,
    projectId: config.FIREBASE_PROJECT_ID,
    storageBucket: config.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
    appId: config.FIREBASE_APP_ID,
  };
  const recent = useMemo(() => {
    // recent are all games from the local storage, and newly deployed
    const exceptGames = new Set(
      gameDeploymentObservable
        .filter((game) => game.gameType === 'youcouldjoin' || game.gameType === 'yours')
        .map((game) => game.address)
        .filter((address) => address !== undefined),
    );
    return gameDeploymentObservable.filter(
      (game) => game.gameType === 'recent' && (!game.address || (game.address && !exceptGames.has(game.address))),
    );
  }, [gameDeploymentObservable]);
  const youcouldjoin = useMemo(() => {
    return gameDeploymentObservable.filter((game) => game.gameType === 'youcouldjoin');
  }, [gameDeploymentObservable]);
  const yours = useMemo(() => {
    return gameDeploymentObservable.filter((game) => game.gameType === 'yours');
  }, [gameDeploymentObservable]);
  const allOtherGames = useMemo(() => {
    const exceptGames = new Set(
      gameDeploymentObservable
        .filter((game) => game.gameType === 'recent')
        .map((game) => game.address)
        .filter((address) => address !== undefined),
    );
    return gameDeploymentObservable.filter(
      (game) => game.gameType === 'allOther' && game.address && !exceptGames.has(game.address),
    );
  }, [gameDeploymentObservable]);
  const app = firebase.initializeApp(firebaseConfig);
  if (config.FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(config.FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      logger.error(e, 'App check failed');
    }
  }

  if (config.FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(config.FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      logger.error(e, 'App check failed');
    }
  }

  const navigate = useNavigate();

  const onCreateBoard = useCallback(async () => {
    if (!midnightWallet.isConnected) {
      midnightWallet.shake();
    } else {
      const game = await deployedGameAPIProvider.deployAndAddGame(midnightWallet.providers, 'recent');
      if (game.address) {
        navigate('/setup/' + game.address);
      }
    }
  }, [deployedGameAPIProvider, midnightWallet.providers, midnightWallet.isConnected]);

  const navigator = useNavigate();
  const onFAQ: () => void = () => {
    navigator('/faq');
  };

  async function onJoin(provider: BattleshipProviders, contractAddress: ContractAddress): Promise<void> {
    if (await BattleshipAPI.gameExists(provider, contractAddress)) {
      localState.addGame(contractAddress);
      deployedGameAPIProvider.addGame(midnightWallet.providers, 'recent', contractAddress);
    } else {
      setSnackBarText('Could not find the game by address ' + contractAddress);
      setSnackBarOpen(true);
    }
  }

  const onJoinGame = useCallback(
    (contractAddress: ContractAddress) => onJoin(midnightWallet.providers, contractAddress),
    [deployedGameAPIProvider, midnightWallet.providers],
  );

  useEffect(() => {
    localState.getGames().forEach((contractAddress) => {
      deployedGameAPIProvider.addGame(midnightWallet.providers, 'recent', contractAddress);
    });

    const subscription = deployedGameAPIProvider.gameDeployments$.subscribe(setGameDeploymentObservable);

    return () => {
      subscription.unsubscribe();
    };
  }, [deployedGameAPIProvider, midnightWallet.providers]);

  async function resolveGame(state: GameContract, contract: ContractAddress): Promise<void> {
    const publicKey = await BattleshipAPI.getPublicKey(midnightWallet.providers);
    if (state.p1 === toHex(publicKey) || state.p2 === toHex(publicKey))
      // i am a player in this game
      deployedGameAPIProvider.addGame(midnightWallet.providers, 'yours', contract);
    else if (state.gameState === GAME_STATE.waiting_p2 && state.p1 !== toHex(publicKey)) {
      deployedGameAPIProvider.addGame(midnightWallet.providers, 'youcouldjoin', contract);
    } else {
      deployedGameAPIProvider.addGame(midnightWallet.providers, 'allOther', contract);
    }
  }

  useEffect(() => {
    if (deployedGameAPIProvider) {
      const unsubscribe = onSnapshot(
        collection(getFirestore(), `/battleship-contracts-` + config.NETWORK_ID),
        (snapshot) => {
          snapshot.forEach((doc) => {
            void resolveGame(doc.data().contract as GameContract, doc.id);
          });
        },
      );
      return () => {
        unsubscribe();
      };
    } else {
      return () => {};
    }
  }, [deployedGameAPIProvider, midnightWallet.providers]);

  const [textPromptOpen, setTextPromptOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {midnight.widget}

      <Snackbar
        open={snackBarOpen}
        autoHideDuration={2000}
        onClose={() => {
          setSnackBarOpen(false);
        }}
        message={snackBarText}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Typography
        align="justify"
        variant="body1"
        color="cornsilk"
        style={{ paddingRight: '100px', paddingLeft: '100px' }}
      >
        Welcome to Sea Battle by{' '}
        <Box
          component="a"
          href="https://bricktowers.io/"
          target="_blank"
          rel="noreferrer"
          sx={{
            color: 'cornsilk',
            textDecoration: 'underline',
          }}
        >
          Brick Towers
        </Box>
        , a modern twist on the classic strategic game, now enhanced with{' '}
        <Box
          component="a"
          href="https://midnight.network/"
          target="_blank"
          rel="noreferrer"
          sx={{
            color: 'cornsilk',
            textDecoration: 'underline',
          }}
        >
          Midnight
        </Box>{' '}
        blockchain&#39;s Zero Knowledge (ZK) capabilities. Challenge other players while ensuring complete privacy—your
        ship locations remain securely in your browser at all times. Game fairness is guaranteed by the{' '}
        <Box
          component="a"
          href="https://midnight.network/"
          target="_blank"
          rel="noreferrer"
          sx={{
            color: 'cornsilk',
            textDecoration: 'underline',
          }}
        >
          Midnight Network
        </Box>
        , offering a trustworthy and engaging gaming experience.
      </Typography>

      <Typography
        align="justify"
        variant="body1"
        color="cornsilk"
        style={{ paddingRight: '100px', paddingLeft: '100px' }}
      >
        To play a game you need a Midnight Lace Wallet with some tDUST and tBTC (Brick Tower Coin) tokens. See the{' '}
        <Box
          component="a"
          href="/faq"
          sx={{
            color: 'cornsilk',
            textDecoration: 'underline',
          }}
        >
          FAQ
        </Box>{' '}
        for more details.
      </Typography>

      <CardActions disableSpacing className="actions">
        <Button startIcon={<CreateBoardIcon />} onClick={onCreateBoard} variant={'text'}>
          Create New Sea Battle
        </Button>
        <div style={{ paddingRight: '20px' }}></div>
        <Button
          startIcon={<JoinBoardIcon />}
          onClick={() => {
            setTextPromptOpen(true);
          }}
        >
          Add Existing Sea Battle
        </Button>
        <div style={{ paddingRight: '20px' }}></div>
        <Button startIcon={<HelpCenterIcon />} onClick={onFAQ}>
          FAQ
        </Button>
      </CardActions>
      <TextPromptDialog
        prompt="Enter sea battle contract address"
        isOpen={textPromptOpen}
        onCancel={() => {
          setTextPromptOpen(false);
        }}
        onSubmit={(text) => {
          setTextPromptOpen(false);
          void onJoinGame(text);
        }}
      />

      {yours.length > 0 && (
        <Typography align="left" variant="body1" color="primary.dark">
          Your Sea Battles
        </Typography>
      )}

      <Grid container spacing={2} className="boards">
        {yours.map((game, idx) => (
          <Grid item key={'board-' + idx}>
            <Board game={game} />
          </Grid>
        ))}
      </Grid>

      {recent.length > 0 && (
        <Typography align="left" variant="body1" color="primary.dark">
          Recently Viewed Sea Battles
        </Typography>
      )}

      <Grid container spacing={2} className="boards">
        {recent.map((game, idx) => (
          <Grid item key={'board-recent-' + idx}>
            <Board game={game} />
          </Grid>
        ))}
      </Grid>

      {youcouldjoin.length > 0 && (
        <Typography align="left" variant="body1" color="primary.dark">
          Sea Battles you could join
        </Typography>
      )}

      <Grid container spacing={2} className="boards">
        {youcouldjoin.map((game, idx) => (
          <Grid item key={'board-' + idx}>
            <Board game={game} />
          </Grid>
        ))}
      </Grid>

      {allOtherGames.length > 0 && (
        <Typography align="left" variant="body1" color="primary.dark">
          All Other Sea Battles
        </Typography>
      )}

      <Grid container spacing={2} className="boards">
        {allOtherGames.map((game, idx) => (
          <Grid item key={'board-' + idx}>
            <Board game={game} />
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default MyBattles;
