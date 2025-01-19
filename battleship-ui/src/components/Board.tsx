import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, LinearProgress, Tooltip, Typography } from '@mui/material';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import { type BattleshipDerivedState, type DeployedBattleshipAPI } from '@bricktowers/battleship-api';
import { type GameDeployment } from '../contexts';
import { auditTime } from 'rxjs';
import { GAME_STATE } from '@bricktowers/battleship-west-contract';
import { useNavigate } from 'react-router-dom';
import {
  game_status,
  left_board,
  left_public_ships,
  MY_STATUS,
  my_status,
  right_board,
  right_public_ships,
} from './Game';
import BattleshipGameBoard from './BattleshipGameBoard';
import './Board.css';
import { type Game } from '../contexts/BrowserDeployedGameManager';

export interface BoardProps {
  game: Game;
}

export const Board: React.FC<Readonly<BoardProps>> = ({ game }) => {
  const [gameDeployment, setGameDeployment] = useState<GameDeployment>();
  const [deployedBattleshipAPI, setDeployedBattleshipAPI] = useState<DeployedBattleshipAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [gameState, setGameState] = useState<BattleshipDerivedState>();
  const [isLoading, setIsLoading] = useState(!!game.observable);

  useEffect(() => {
    if (!game.observable) {
      return;
    }
    const subscription = game.observable.subscribe(setGameDeployment);

    return () => {
      subscription.unsubscribe();
    };
  }, [game.observable]);

  useEffect(() => {
    if (!gameDeployment) {
      return;
    }
    if (gameDeployment.status === 'in-progress') {
      return;
    }
    setIsLoading(false);

    if (gameDeployment.status === 'failed') {
      setErrorMessage(
        gameDeployment.error.message.length ? gameDeployment.error.message : 'Encountered an unexpected error.',
      );
      return;
    }
    setDeployedBattleshipAPI(gameDeployment.api);
    const subscription = gameDeployment.api.state$.pipe(auditTime(1000)).subscribe(setGameState);
    return () => {
      subscription.unsubscribe();
    };
  }, [gameDeployment, setIsLoading, setErrorMessage, setDeployedBattleshipAPI]);

  const navigate = useNavigate();
  const play = (): void => {
    if (gameState) {
      if (gameState.p1 === gameState.whoami && gameState.state > GAME_STATE.waiting_p1) {
        navigate(`/game/${deployedBattleshipAPI?.deployedContractAddress}`);
      } else if (gameState.p2 === gameState.whoami && gameState.state > GAME_STATE.waiting_p2) {
        navigate(`/game/${deployedBattleshipAPI?.deployedContractAddress}`);
      } else if (gameState.state <= GAME_STATE.waiting_p2) {
        navigate(`/setup/${deployedBattleshipAPI?.deployedContractAddress}`);
      } else {
        navigate(`/game/${deployedBattleshipAPI?.deployedContractAddress}`);
      }
    }
  };

  const getCardClasses = (): string => {
    if (!gameState) {
      return 'board-loading';
    }

    return '';
  };

  const statusContent: () => React.ReactNode = () => {
    if (errorMessage) {
      return (
        <Tooltip title={errorMessage}>
          <Typography
            align="center"
            variant="body2"
            color="error.main"
            style={{
              height: '40px',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '3px',
              }}
            >
              <StopIcon fontSize="small" />
              {errorMessage.length > 50 ? errorMessage.slice(0, 50) + '...' : errorMessage}
            </div>
          </Typography>
        </Tooltip>
      );
    } else if (isLoading) {
      return (
        <Typography
          align="center"
          variant="body2"
          color="primary.dark"
          style={{
            height: '40px',
          }}
        >
          <div>
            <LinearProgress />
            Loading...
          </div>
        </Typography>
      );
    } else {
      return (
        <Typography
          align="center"
          variant="body2"
          color="primary.dark"
          style={{
            height: '40px',
          }}
        >
          {game_status(gameState)}
        </Typography>
      );
    }
  };

  return (
    <Box
      onClick={play}
      sx={{
        cursor: 'pointer',
        display: 'inline-block',
        textDecoration: 'none',
        borderRadius: 2,
        boxShadow: 3,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6,
        },
      }}
    >
      <Card
        style={{
          width: '250px',
          height: '170px',
          backgroundColor: 'transparent',
          color: 'cornsilk',
          border: '1px solid cornsilk',
          borderRadius: '6px',
        }}
        className={getCardClasses()}
      >
        <React.Fragment>
          <CardContent>
            <Typography
              align="center"
              variant="body2"
              color="primary.dark"
              style={{
                height: '40px',
              }}
            >
              {statusContent()}
            </Typography>

            <Grid container spacing={4} style={{ backgroundColor: 'transparent' }}>
              <Grid item lg={6}>
                <div
                  style={{
                    transform: 'scale(0.3)',
                    transformOrigin: 'top left',
                    width: '89px',
                    height: '89px',
                  }}
                >
                  <BattleshipGameBoard
                    privateShips={my_status(gameState) === MY_STATUS.watching ? undefined : gameState?.privateShips}
                    publicShips={left_public_ships(gameState)}
                    buttons={false}
                    state={left_board(gameState)}
                    selectedShip={undefined}
                    setSelectedShip={() => {}}
                  ></BattleshipGameBoard>
                </div>
              </Grid>
              <Grid item lg={6}>
                <div
                  style={{
                    transform: 'scale(0.3)',
                    transformOrigin: 'top left',
                    width: '89px',
                    height: '89px',
                  }}
                >
                  <BattleshipGameBoard
                    privateShips={undefined}
                    publicShips={right_public_ships(gameState)}
                    buttons={false}
                    state={right_board(gameState)}
                    selectedShip={undefined}
                    setSelectedShip={() => {}}
                  ></BattleshipGameBoard>
                </div>
              </Grid>
            </Grid>

            <Typography align="right" variant="body2" color="primary.light">
              ...{game.address?.substring((game.address?.length || 8) - 8)}
            </Typography>
          </CardContent>
        </React.Fragment>
      </Card>
    </Box>
  );
};
