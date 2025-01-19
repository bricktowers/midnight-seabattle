import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Backdrop,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Grid,
  Snackbar,
  Typography,
} from '@mui/material';
import {
  BattleshipAPI,
  type BattleshipDerivedState,
  type BattleshipProviders,
  type DeployedBattleshipAPI,
} from '@bricktowers/battleship-api';
import { useDeployedGameContext } from '../hooks';
import { type GameDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import {
  convertPartialShips,
  type Coord,
  GAME_STATE,
  getOccupiedCells,
  type PartialShips,
  type Ships,
  validateShips,
} from '@bricktowers/battleship-west-contract';
import { useDrag, useDrop } from 'react-dnd';
import { useNavigate, useParams } from 'react-router-dom';
import CheckIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { Ship, shipClassesLookup, type ShipItem } from './Ship';
import './shipz.css';
import './Setup.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { useMidnightWallet } from './MidnightWallet';
import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';

export interface ShipClass {
  verticalClass: string;
  horizontalClass: string;
}

export interface SetupProps {
  logger: Logger;
}

export const Setup: React.FC<SetupProps> = ({ logger }) => {
  const deployedGameAPIProvider = useDeployedGameContext();
  const midnightWallet = useMidnightWallet();
  const [gameDeployment, setGameDeployment] = useState<GameDeployment>();
  const [deployedBattleshipAPI, setDeployedBattleshipAPI] = useState<DeployedBattleshipAPI>();
  const [snackBarOpen, setSnackBarOpen] = useState(false);
  const [snackBarText, setSnackBarText] = useState('');
  const [gameState, setGameState] = useState<BattleshipDerivedState>();
  const [ships, setShips] = useState<Ships | undefined>(undefined);
  const [gameDeploymentObservable, setGameDeploymentObservable] = useState<Observable<GameDeployment> | undefined>(
    undefined,
  );
  const [isWorking, setIsWorking] = useState(!!gameDeploymentObservable);
  const [partialShips, setPartialShips] = useState<PartialShips>({
    v21: false,
    v31: false,
    v32: false,
    v41: false,
    v51: false,
  });

  useEffect(() => {
    setShips(convertPartialShips(partialShips));
  }, [partialShips]);
  const { contract } = useParams();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const [board, setBoard] = useState<number[][]>(Array.from({ length: 10 }, () => Array(10).fill(0)));
  const editMode = useMemo(() => {
    return !!gameState;
  }, [ships, gameState]);

  const handleReset = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    setBoard(Array.from({ length: 10 }, () => Array(10).fill(0)));
    setPartialShips({
      v21: false,
      v31: false,
      v32: false,
      v41: false,
      v51: false,
    });
  };

  const handleSubmit = (): void => {
    if (!midnightWallet.isConnected) {
      midnightWallet.shake();
    } else {
      if (ships) {
        void handleUserSubmit(ships);
      }
    }
  };

  async function onJoin(provider: BattleshipProviders, contractAddress: ContractAddress): Promise<void> {
    if (await BattleshipAPI.gameExists(provider, contractAddress)) {
      setGameDeploymentObservable(
        deployedGameAPIProvider.addGame(midnightWallet.providers, 'recent', contractAddress).observable,
      );
    } else {
      setSnackBarText('Could not find the game by address ' + contractAddress);
      setSnackBarOpen(true);
    }
  }

  useEffect(() => {
    if (contract) {
      void onJoin(midnightWallet.providers, contract);
    }
  }, [contract, midnightWallet.providers, deployedGameAPIProvider]);

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
    const subscription = gameDeployment.api.state$.subscribe(setGameState);
    return () => {
      subscription.unsubscribe();
    };
  }, [gameDeployment, setIsWorking, setDeployedBattleshipAPI]);

  const handleUserSubmit = async (ships: Ships): Promise<void> => {
    try {
      if (!!deployedBattleshipAPI && !!gameState) {
        setIsWorking(true);
        if (gameState.state === GAME_STATE.waiting_p1) {
          await deployedBattleshipAPI.set_board(ships);
          await deployedBattleshipAPI.join_p1();
        } else if (gameState.state === GAME_STATE.waiting_p2 && gameState.p1 !== gameState.whoami) {
          await deployedBattleshipAPI.set_board(ships);
          await deployedBattleshipAPI.join_p2();
        }
        navigate(`/game/${deployedBattleshipAPI?.deployedContractAddress}`);
      }
    } catch (error) {
      logger.error(error, "Couldn't submit ships");
      setShips(undefined);
      setSnackBarText(error instanceof Error ? error.message : String(error));
      setSnackBarOpen(true);
    } finally {
      setIsWorking(false);
    }
  };

  const navigate = useNavigate();
  useEffect(() => {
    if (!!deployedBattleshipAPI && !!gameState && !isWorking) {
      if (gameState.p1 === gameState.whoami && gameState.state > GAME_STATE.waiting_p1) {
        navigate(`/game/${deployedBattleshipAPI?.deployedContractAddress}`);
      } else if (gameState.p2 === gameState.whoami && gameState.state > GAME_STATE.waiting_p2) {
        navigate(`/game/${deployedBattleshipAPI?.deployedContractAddress}`);
      }
    }
  }, [gameState, deployedBattleshipAPI, isWorking]);

  const setV21 = function (value: boolean): void {
    setPartialShips((prevValue) => ({
      ...prevValue,
      v21: value,
    }));
  };
  const setV31 = function (value: boolean): void {
    setPartialShips((prevValue) => ({
      ...prevValue,
      v31: value,
    }));
  };
  const setV32 = function (value: boolean): void {
    setPartialShips((prevValue) => ({
      ...prevValue,
      v32: value,
    }));
  };
  const setV41 = function (value: boolean): void {
    setPartialShips((prevValue) => ({
      ...prevValue,
      v41: value,
    }));
  };
  const setV51 = function (value: boolean): void {
    setPartialShips((prevValue) => ({
      ...prevValue,
      v51: value,
    }));
  };

  const toCellNode = (rowIndex: number, colIndex: number, cellValue: number): React.ReactNode => {
    const [hoverShip, setHoverShip] = useState<string | undefined>(undefined);

    // ships starts in this cell [rowIndex, colIndex], but might be also extended to other cells
    const shipNameStartsHere = useMemo(() => {
      for (const id of Object.keys(shipClassesLookup)) {
        const coordKey = `s${id}` as keyof PartialShips;
        const coordinates = partialShips[coordKey] as Coord | undefined;
        if (coordinates && BigInt(rowIndex + 1) === coordinates.y && BigInt(colIndex + 1) === coordinates.x) {
          return id;
        }
      }
      return undefined;
    }, [partialShips]);

    const shipV = useMemo(() => {
      if (shipNameStartsHere) {
        const verticalKey = `v${shipNameStartsHere}` as keyof PartialShips;
        return partialShips[verticalKey] as boolean;
      } else return false;
    }, [shipNameStartsHere, partialShips]);

    const shipClass = useMemo(() => {
      const foundShip = hoverShip ? shipClassesLookup[hoverShip] : null;
      if (foundShip) {
        const verticalKey = `v${hoverShip}` as keyof PartialShips;
        const vertical = partialShips[verticalKey] as boolean;
        return vertical ? foundShip.verticalClass : foundShip.horizontalClass;
      } else if (shipNameStartsHere) {
        return (
          (shipV
            ? shipClassesLookup[shipNameStartsHere]?.verticalClass
            : shipClassesLookup[shipNameStartsHere]?.horizontalClass) || ''
        );
      } else return '';
    }, [partialShips, hoverShip, shipNameStartsHere, shipV]);

    const isShip = useMemo(() => {
      return getOccupiedCells(partialShips).some((coord) => {
        return coord.x === BigInt(colIndex + 1) && coord.y === BigInt(rowIndex + 1);
      });
    }, [partialShips]);

    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    const [{ isOver }, dropRef] = useDrop<ShipItem, void, { isOver: boolean }>(
      () => ({
        accept: 'ship',
        drop: (item) => {
          const skey = 's' + item.name;
          const coord: Coord = { y: BigInt(rowIndex + 1), x: BigInt(colIndex + 1) };
          setPartialShips((prevValue) => ({
            ...prevValue,
            [skey]: coord,
          }));
        },
        canDrop: (item) => {
          const skey = 's' + item.name;
          const coord: Coord = { y: BigInt(rowIndex + 1), x: BigInt(colIndex + 1) };
          const newPartialShips = {
            ...partialShips,
            [skey]: coord,
          };
          return validateShips(newPartialShips);
        },
        collect: (monitor) => ({
          isOver: !!monitor.isOver(),
          canDrop: !!monitor.canDrop(),
        }),
        hover: (item) => {
          setHoverShip(item.name);
        },
        leave: () => {
          setHoverShip(undefined);
        },
      }),
      [rowIndex, colIndex, partialShips],
    );

    const [{ isDragging }, dragRef] = useDrag(
      () => ({
        type: 'ship',
        item: { name: shipNameStartsHere },
        collect: (monitor) => ({
          isDragging: monitor.isDragging(),
        }),
      }),
      [rowIndex, colIndex, partialShips, shipNameStartsHere],
    );

    const combinedRef = (node: never): void => {
      dragRef(node);
      dropRef(node);
    };

    useEffect(() => {
      if (!isOver) {
        setHoverShip(undefined);
      }
    }, [isOver]);

    const onClickCell = useCallback(() => {
      if (editMode && !!shipNameStartsHere) {
        const verticalKey = `v${shipNameStartsHere}` as keyof PartialShips;
        setPartialShips((prevValue) => {
          const updatedPartialShips = {
            ...prevValue,
            [verticalKey]: !shipV,
          };
          if (validateShips(updatedPartialShips)) {
            return updatedPartialShips;
          } else {
            return prevValue;
          }
        });
      }
    }, [editMode, shipNameStartsHere, shipV]);

    return (
      <Box
        ref={combinedRef}
        key={`setup-cell-${rowIndex}-${colIndex}`}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1fr, 1fr)',
          width: '25px',
          height: '25px',
          border: '1px solid #000',
          position: 'relative',
          backgroundColor: 'cornsilk',
          cursor: isDragging ? 'grabbing' : shipClass === '' ? 'not-allowed' : 'grab',
        }}
        onClick={() => {
          onClickCell();
        }}
        className={!isDragging ? shipClass : ''}
      >
        {isShip && (
          <Box
            key={`col-label-${colIndex}`}
            sx={{
              width: '25px',
              height: '25px',
              // zIndex: 100,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              paddingBottom: '1px',
              paddingInlineEnd: '2px',
              color: 'cornsilk',
            }}
          >
            <FontAwesomeIcon icon={faCircle as IconProp} />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <div>
      {midnightWallet.widget}

      <Snackbar
        open={snackBarOpen}
        autoHideDuration={2000} // 1 second
        onClose={() => {
          setSnackBarOpen(false);
        }}
        message={snackBarText}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Typography align="center" variant="h1" color="primary.dark" style={{ paddingBottom: '20px' }}>
        Place your ships on the board
      </Typography>
      <Card sx={{ backgroundColor: 'transparent' }}>
        <React.Fragment>
          <CardContent>
            <Grid container spacing={4}>
              <Grid item>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(11, 1fr)',
                    gap: '2px',
                    width: 'fit-content',
                    margin: '0 auto',
                    overflow: 'visible',
                    textAlign: 'center',
                  }}
                >
                  <Box sx={{ width: '25px', height: '25px' }} />

                  {Array.from({ length: 10 }).map((_, colIndex) => (
                    <Box
                      key={`col-label-${colIndex}`}
                      sx={{
                        width: '25px',
                        height: '25px',
                        color: 'cornsilk',
                      }}
                    >
                      {colIndex + 1}
                    </Box>
                  ))}

                  {board.map((row, rowIndex) => (
                    <>
                      <Box
                        key={`row-label-${rowIndex}`}
                        sx={{
                          width: '25px',
                          height: '25px',
                          fontWeight: 'bold',
                          color: 'cornsilk',
                        }}
                      >
                        {String.fromCharCode(65 + rowIndex)}
                      </Box>

                      {row.map((cell, colIndex) => toCellNode(rowIndex, colIndex, cell))}
                    </>
                  ))}
                </Box>
              </Grid>
              <Grid item textAlign={'left'}>
                {!partialShips.s21 && (
                  <div>
                    <Typography variant="subtitle1">Destroyer</Typography>
                    <Ship
                      name="21"
                      size={2}
                      vertical={partialShips.v21}
                      onClick={() => {
                        setV21(!partialShips.v21);
                      }}
                    ></Ship>
                  </div>
                )}
                {!partialShips.s31 && (
                  <div>
                    <Typography variant="subtitle1">Submarine</Typography>
                    <Ship
                      name="31"
                      size={3}
                      vertical={partialShips.v31}
                      onClick={() => {
                        setV31(!partialShips.v31);
                      }}
                    ></Ship>
                  </div>
                )}
                {!partialShips.s32 && (
                  <div>
                    <Typography variant="subtitle1">Cruiser</Typography>
                    <Ship
                      name="32"
                      size={3}
                      vertical={partialShips.v32}
                      onClick={() => {
                        setV32(!partialShips.v32);
                      }}
                    ></Ship>
                  </div>
                )}
                {!partialShips.s41 && (
                  <div>
                    <Typography variant="subtitle1">Battleship</Typography>
                    <Ship
                      name="41"
                      size={4}
                      vertical={partialShips.v41}
                      onClick={() => {
                        setV41(!partialShips.v41);
                      }}
                    ></Ship>
                  </div>
                )}
                {!partialShips.s51 && (
                  <div>
                    <Typography variant="subtitle1">Carrier</Typography>
                    <Ship
                      name="51"
                      size={5}
                      vertical={partialShips.v51}
                      onClick={() => {
                        setV51(!partialShips.v51);
                      }}
                    ></Ship>
                  </div>
                )}
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

          {editMode && (
            <CardActions>
              <Button startIcon={<DeleteIcon />} onClick={handleReset}>
                Reset
              </Button>

              <Button
                variant="outlined"
                startIcon={<CheckIcon />}
                onClick={handleSubmit}
                className="submit"
                disabled={ships === undefined}
              >
                Submit
              </Button>
            </CardActions>
          )}
        </React.Fragment>
      </Card>
    </div>
  );
};
