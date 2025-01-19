import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { faBomb, faSkullCrossbones, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faCircle, faXmarkCircle } from '@fortawesome/free-regular-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  Backdrop,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BattleshipAPI,
  type BattleshipDerivedState,
  type BattleshipProviders,
  type BOARD_STATE,
  type DeployedBattleshipAPI,
  emptyState,
} from '@bricktowers/battleship-api';
import { useDeployedGameContext } from '../hooks';
import { type GameDeployment } from '../contexts';
import { auditTime, distinctUntilChanged, type Observable } from 'rxjs';
import { useNavigate, useParams } from 'react-router-dom';
import { type Coord, GAME_STATE, type PartialShips } from '@bricktowers/battleship-west-contract';
import BattleshipGameBoard, { type Cell } from './BattleshipGameBoard';
import { useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import ShareIcon from '@mui/icons-material/ShareOutlined';
import { useMidnightWallet } from './MidnightWallet';
import { useGameLocalState } from '../hooks/useGameLocalState';

export enum MY_STATUS {
  watching = 0,
  playing_as_player1 = 1,
  playing_as_player2 = 2,
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const my_status = (boardState: BattleshipDerivedState | undefined): MY_STATUS => {
  if (boardState === undefined) {
    return MY_STATUS.watching;
  } else if (boardState?.p1 === boardState?.whoami) {
    return MY_STATUS.playing_as_player1;
  } else if (boardState?.p2 === boardState?.whoami) {
    return MY_STATUS.playing_as_player2;
  } else {
    return MY_STATUS.watching;
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const my_turn = (boardState: BattleshipDerivedState | undefined): boolean => {
  const myStatus = my_status(boardState);
  if (boardState?.state === GAME_STATE.p1_turn && myStatus === MY_STATUS.playing_as_player1) {
    return true;
  } else if (boardState?.state === GAME_STATE.p2_turn && myStatus === MY_STATUS.playing_as_player2) {
    return true;
  } else {
    return false;
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const opp_turn = (boardState: BattleshipDerivedState | undefined): boolean => {
  const myStatus = my_status(boardState);
  if (boardState?.state === GAME_STATE.p2_turn && myStatus === MY_STATUS.playing_as_player1) {
    return true;
  } else if (boardState?.state === GAME_STATE.p1_turn && myStatus === MY_STATUS.playing_as_player2) {
    return true;
  } else {
    return false;
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const left_board = (boardState: BattleshipDerivedState | undefined): BOARD_STATE[][] => {
  const myStatus = my_status(boardState);
  if (myStatus === MY_STATUS.playing_as_player1 || myStatus === MY_STATUS.watching) {
    return boardState?.p1Board ?? emptyState.p1Board;
  } else {
    return boardState?.p2Board ?? emptyState.p2Board;
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const right_board = (boardState: BattleshipDerivedState | undefined): BOARD_STATE[][] => {
  const myStatus = my_status(boardState);
  if (myStatus === MY_STATUS.playing_as_player2) {
    return boardState?.p1Board ?? emptyState.p1Board;
  } else {
    return boardState?.p2Board ?? emptyState.p2Board;
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const left_public_ships = (boardState: BattleshipDerivedState | undefined): PartialShips => {
  const myStatus = my_status(boardState);
  if (myStatus === MY_STATUS.playing_as_player1 || myStatus === MY_STATUS.watching) {
    return boardState?.p1PartialShips ?? emptyState.p1PartialShips;
  } else {
    return boardState?.p2PartialShips ?? emptyState.p2PartialShips;
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const right_public_ships = (boardState: BattleshipDerivedState | undefined): PartialShips => {
  const myStatus = my_status(boardState);
  if (myStatus === MY_STATUS.playing_as_player2) {
    return boardState?.p1PartialShips ?? emptyState.p1PartialShips;
  } else {
    return boardState?.p2PartialShips ?? emptyState.p2PartialShips;
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const left_board_title = (boardState: BattleshipDerivedState | undefined): string => {
  const myStatus = my_status(boardState);
  if (myStatus === MY_STATUS.playing_as_player1 || myStatus === MY_STATUS.playing_as_player2) {
    return 'My board';
  } else {
    return 'Player 1';
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const right_board_title = (boardState: BattleshipDerivedState | undefined): string => {
  const myStatus = my_status(boardState);
  if (myStatus === MY_STATUS.playing_as_player1 || myStatus === MY_STATUS.playing_as_player2) {
    return 'Opponent board';
  } else {
    return 'Player 2';
  }
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const game_status = (boardState: BattleshipDerivedState | undefined): React.ReactNode => {
  const state = boardState?.state;
  const myStatus = my_status(boardState);

  const gameStatus = (() => {
    switch (state) {
      case GAME_STATE.waiting_p1:
        return 'Waiting for the first player to join the game';
      case GAME_STATE.waiting_p2:
        switch (myStatus) {
          case MY_STATUS.playing_as_player1:
            return 'Waiting for your opponent to join the game';
          default:
            return 'Waiting for the second player to join the game';
        }
      case GAME_STATE.p1_turn:
        switch (myStatus) {
          case MY_STATUS.watching:
            return "Player 1's turn...";
          case MY_STATUS.playing_as_player1:
            return 'It’s your turn!';
          case MY_STATUS.playing_as_player2:
            if (boardState?.lastShotResult !== undefined) return 'Waiting for your opponent to validate your shot';
            else return 'Waiting for your opponent to make their first move';
          default:
            return '';
        }
      case GAME_STATE.p2_turn:
        switch (myStatus) {
          case MY_STATUS.watching:
            return "Player 2's turn...";
          case MY_STATUS.playing_as_player1:
            return 'Waiting for your opponent to validate your shot';
          case MY_STATUS.playing_as_player2:
            return 'It’s your turn!';
          default:
            return '';
        }
      case GAME_STATE.p1_wins:
        switch (myStatus) {
          case MY_STATUS.watching:
            return 'Player 1 is victorious!';
          case MY_STATUS.playing_as_player1:
            return 'Congratulations, you win!';
          case MY_STATUS.playing_as_player2:
            return 'Better luck next time—you lost.';
          default:
            return '';
        }
      case GAME_STATE.p2_wins:
        switch (myStatus) {
          case MY_STATUS.watching:
            return 'Player 2 is victorious!';
          case MY_STATUS.playing_as_player1:
            return 'You lost—better luck next time.';
          case MY_STATUS.playing_as_player2:
            return 'Congratulations, you win!';
          default:
            return '';
        }
      default:
        return (
          <div>
            <LinearProgress data-testid="board-working-indicator" />
            Please wait, loading...
          </div>
        );
    }
  })();

  return gameStatus;
};

export function playNotificationSound(): void {
  const audioContext = new window.AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // Connect the oscillator to the gain node and then to the audio context
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Set a pleasant waveform type
  oscillator.type = 'sine'; // Options: 'sine', 'square', 'sawtooth', 'triangle'

  // Create a melody for the notification sound
  const now = audioContext.currentTime;
  oscillator.frequency.setValueAtTime(660, now); // E5
  oscillator.frequency.setValueAtTime(880, now + 0.1); // A5
  oscillator.frequency.setValueAtTime(660, now + 0.2); // E5

  // Control volume and duration
  gainNode.gain.setValueAtTime(0.5, now); // Volume (0.0 to 1.0)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3); // Fade out

  // Start and stop the sound
  oscillator.start(now);
  oscillator.stop(now + 0.3);
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export const Game: React.FC = () => {
  const deployedGameAPIProvider = useDeployedGameContext();
  const midnightWallet = useMidnightWallet();
  const { contract } = useParams();
  const config = useRuntimeConfiguration();
  const [gameDeployment, setGameDeployment] = useState<GameDeployment>();
  const [deployedBattleshipAPI, setDeployedBattleshipAPI] = useState<DeployedBattleshipAPI>();
  const [gameState, setGameState] = useState<BattleshipDerivedState>();
  const [gameDeploymentObservable, setGameDeploymentObservable] = useState<Observable<GameDeployment> | undefined>(
    undefined,
  );
  const [isWorking, setIsWorking] = useState(!!gameDeploymentObservable);
  const [selectedShip, setSelectedShip] = useState<Cell | undefined>(undefined);
  const prevBoardState = usePrevious(gameState);
  const midnight = useMidnightWallet();
  const localState = useGameLocalState();

  const lastPlayedRef = useRef(Date.now());
  useEffect(() => {
    const myStatus = my_status(gameState);
    if (
      (!!gameState && myStatus === MY_STATUS.watching && gameState.state >= GAME_STATE.p1_turn) ||
      (my_turn(gameState) && opp_turn(prevBoardState)) ||
      (!!gameState && gameState.state >= GAME_STATE.p1_wins)
    ) {
      const now = Date.now();
      if (now - lastPlayedRef.current > 3000) {
        playNotificationSound();
        lastPlayedRef.current = now;
      }
    }
  }, [gameState]);

  const myStatus = useMemo(() => {
    return my_status(gameState);
  }, [gameState]);

  const myTurn = useMemo(() => {
    return my_turn(gameState);
  }, [gameState]);

  const leftBoard = useMemo(() => {
    return left_board(gameState);
  }, [gameState]);

  const rightBoard = useMemo(() => {
    return right_board(gameState);
  }, [gameState]);

  async function onJoin(provider: BattleshipProviders, contractAddress: ContractAddress): Promise<void> {
    if (await BattleshipAPI.gameExists(provider, contractAddress)) {
      localState.addGame(contractAddress);
      setGameDeploymentObservable(
        deployedGameAPIProvider.addGame(midnightWallet.providers, 'recent', contractAddress).observable,
      );
    } else {
      setIsWorking(false);
      setSnackBarText('Could not find the game by address ' + contractAddress);
      setSnackBarOpen(true);
    }
  }

  useEffect(() => {
    if (contract) {
      setIsWorking(true);
      void onJoin(midnightWallet.providers, contract);
    }
  }, [contract, midnightWallet.providers, deployedGameAPIProvider]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedBattleshipAPI) {
      await navigator.clipboard.writeText(config.PUBLIC_URL + '/game/' + deployedBattleshipAPI.deployedContractAddress);
      setSnackBarText('Game link copied to your clipboard. Share it with your friends!');
      setSnackBarOpen(true);
    }
  }, [deployedBattleshipAPI, config]);

  useEffect(() => {
    if (!gameDeploymentObservable) {
      return;
    }
    const subscription = gameDeploymentObservable.subscribe(setGameDeployment);

    return () => {
      subscription.unsubscribe();
    };
  }, [gameDeploymentObservable]);

  useEffect(() => {
    if (!gameDeployment) {
      return;
    }
    if (gameDeployment.status === 'in-progress') {
      return;
    }
    setIsWorking(false);

    if (gameDeployment.status === 'failed') {
      setSnackBarText(
        gameDeployment.error.message.length ? gameDeployment.error.message : 'Encountered an unexpected error.',
      );
      setSnackBarOpen(true);
      return;
    }
    setDeployedBattleshipAPI(gameDeployment.api);
    const subscription = gameDeployment.api.state$
      .pipe(auditTime(1000), distinctUntilChanged())
      .subscribe(setGameState);
    return () => {
      subscription.unsubscribe();
    };
  }, [gameDeployment, setIsWorking, setDeployedBattleshipAPI]);

  const onCellClick = async (coord: Coord): Promise<void> => {
    if (!midnightWallet.isConnected) {
      midnightWallet.shake();
      return;
    }
    if (gameState?.state !== GAME_STATE.p1_turn && gameState?.state !== GAME_STATE.p2_turn) {
      return;
    }
    try {
      if (deployedBattleshipAPI) {
        setIsWorking(true);
        if (gameState?.p1 === gameState?.whoami && gameState?.state === GAME_STATE.p1_turn) {
          await deployedBattleshipAPI.turn_player1(coord);
        } else {
          await deployedBattleshipAPI.turn_player2(coord);
        }
      }
    } catch (error: unknown) {
      setSnackBarText(error instanceof Error ? error.message : String(error));
      setSnackBarOpen(true);
    } finally {
      setSelectedShip(undefined);
      setIsWorking(false);
    }
  };

  useEffect(() => {
    if (selectedShip) {
      void onCellClick({ x: BigInt(selectedShip.col + 1), y: BigInt(selectedShip.row + 1) });
    }
  }, [selectedShip]);

  const navigate = useNavigate();
  const navigateToSetup = (): void => {
    navigate(`/setup/${deployedBattleshipAPI?.deployedContractAddress}`);
  };

  const [snackBarOpen, setSnackBarOpen] = useState(false);
  const [snackBarText, setSnackBarText] = useState('');

  const joinableGame = useMemo(() => {
    if (!gameState) return false;
    else if (myStatus !== MY_STATUS.watching) return false;
    else if (gameState.state <= GAME_STATE.waiting_p2) return true;
    return false;
  }, [gameState]);

  return (
    <div>
      {midnight.widget}

      <Snackbar
        open={snackBarOpen}
        autoHideDuration={3000}
        onClose={() => {
          setSnackBarOpen(false);
          setSnackBarText('');
        }}
        message={snackBarText}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Typography align="center" variant="h1" color="primary.dark" style={{ paddingBottom: '20px' }}>
        {game_status(gameState)}
      </Typography>

      <Button startIcon={<ShareIcon />} onClick={onCopyContractAddress}>
        Share Game
      </Button>

      {joinableGame && (
        <Tooltip title="Click me!" arrow>
          <Button startIcon={<ShareIcon />} onClick={navigateToSetup}>
            Join Game
          </Button>
        </Tooltip>
      )}

      <div style={{ paddingRight: '20px' }}></div>

      <Card style={{ backgroundColor: 'transparent', color: 'cornsilk' }}>
        <React.Fragment>
          <CardContent>
            <Grid container spacing={4}>
              <Grid item sm={12} md={6}>
                <Typography align="center" variant="body2" color="primary.dark">
                  {left_board_title(gameState)}
                </Typography>
                <BattleshipGameBoard
                  privateShips={my_status(gameState) === MY_STATUS.watching ? undefined : gameState?.privateShips}
                  publicShips={left_public_ships(gameState)}
                  buttons={false}
                  state={leftBoard}
                  selectedShip={undefined}
                  setSelectedShip={() => {}}
                ></BattleshipGameBoard>
              </Grid>
              <Grid item sm={12} md={6}>
                <Typography align="center" variant="body2" color="primary.dark">
                  {right_board_title(gameState)}
                </Typography>
                <BattleshipGameBoard
                  privateShips={undefined}
                  publicShips={right_public_ships(gameState)}
                  buttons={myTurn}
                  state={rightBoard}
                  selectedShip={selectedShip}
                  setSelectedShip={setSelectedShip}
                ></BattleshipGameBoard>
              </Grid>
            </Grid>
          </CardContent>

          <Backdrop
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              color: '#fff',
              zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
            open={isWorking}
          >
            <CircularProgress />
          </Backdrop>
        </React.Fragment>
      </Card>

      <Card style={{ backgroundColor: 'transparent', color: 'cornsilk', marginTop: '32px' }}>
        <Typography align="center" variant="h2" color="primary.dark">
          Legend
        </Typography>
        <ul style={{ listStyleType: 'none', fontSize: '13px' }}>
          <li>
            <FontAwesomeIcon icon={faCircle as IconProp} /> — <strong>Intact Section:</strong> This represents an
            undamaged part of your ship. If you see it, the vessel is still in the game.
          </li>
          <li>
            <FontAwesomeIcon icon={faXmarkCircle as IconProp} /> — <strong>Hit Section:</strong> A part of the ship that
            has been hit. If the opponent’s ship is not yet destroyed, look for the target in nearby cells.
          </li>
          <li>
            <FontAwesomeIcon icon={faBomb as IconProp} /> — <strong>Shot Attempt:</strong> A fired shot. The next turn
            will show whether it was a hit or a miss.
          </li>
          <li>
            <FontAwesomeIcon icon={faXmark as IconProp} /> — <strong>Miss:</strong> A shot that missed and did not hit
            any part of a ship.
          </li>
          <li>
            <FontAwesomeIcon icon={faSkullCrossbones as IconProp} /> — <strong>Destroyed Ship:</strong> The entire ship
            has been sunk.
          </li>
        </ul>
      </Card>
    </div>
  );
};
