import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { faBomb, faSkullCrossbones, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faCircle, faXmarkCircle } from '@fortawesome/free-regular-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type IconProp } from '@fortawesome/fontawesome-svg-core';
import { BOARD_STATE } from '@bricktowers/battleship-api';
import { type Coord, getOccupiedCells, type PartialShips, type Ships } from '@bricktowers/battleship-west-contract';
import { shipClassesLookup } from './Ship';
import './shipz.css';

interface BattleshipGameBoardProps {
  state: BOARD_STATE[][];
  privateShips: Ships | undefined;
  publicShips: PartialShips;
  buttons: boolean;
  selectedShip: Cell | undefined;
  setSelectedShip: (cell: Cell) => void;
}

export interface Cell {
  row: number;
  col: number;
}

export const cellDesign = (cell: BOARD_STATE): React.ReactNode => {
  switch (cell) {
    case BOARD_STATE.empty:
      return <></>;
    case BOARD_STATE.ship:
      return <FontAwesomeIcon icon={faCircle as IconProp} />;
    case BOARD_STATE.ship_sunk:
      return <FontAwesomeIcon icon={faSkullCrossbones as IconProp} />;
    case BOARD_STATE.ship_hit:
      return <FontAwesomeIcon icon={faXmarkCircle as IconProp} beatFade />;
    case BOARD_STATE.attempt:
      return <FontAwesomeIcon icon={faBomb as IconProp} />;
    case BOARD_STATE.miss:
      return <FontAwesomeIcon icon={faXmark as IconProp} />;
    default:
      return <>?</>;
  }
};

const BattleshipGameBoard: React.FC<BattleshipGameBoardProps> = ({
  buttons,
  state,
  privateShips,
  publicShips,
  selectedShip,
  setSelectedShip,
}) => {
  const [hoveredCell, setHoveredCell] = useState<Cell | undefined>(undefined);

  const handleMouseEnter = (rowIndex: number, colIndex: number): void => {
    setHoveredCell({ row: rowIndex, col: colIndex });
  };

  const handleMouseLeave = (): void => {
    setHoveredCell(undefined);
  };

  const handleCellClick = (row: number, col: number): void => {
    if (state[row][col] !== BOARD_STATE.empty) {
      return;
    }
    if (!buttons) {
      return;
    }
    setSelectedShip({ row, col });
  };

  const toCellNode = (rowIndex: number, colIndex: number, cellValue: BOARD_STATE): React.ReactNode => {
    const [shipClass, setShipClass] = useState('');
    const row = BigInt(rowIndex + 1);
    const col = BigInt(colIndex + 1);

    let cellNode = cellDesign(cellValue);
    let cellColor = 'rgb(255, 248, 220)';
    if (
      (buttons && !!hoveredCell && (hoveredCell.row === rowIndex || hoveredCell.col === colIndex)) ||
      (!!selectedShip && (selectedShip.row === rowIndex || selectedShip.col === colIndex))
    ) {
      cellColor = 'rgba(255, 248, 220, 0.8)';
    }
    if (rowIndex === selectedShip?.row && colIndex === selectedShip?.col) {
      cellNode = <FontAwesomeIcon icon={faBomb as IconProp} />;
    }

    function getShipClass(ships: Ships | PartialShips): string {
      for (const id of Object.keys(shipClassesLookup)) {
        const coordKey = `s${id}` as keyof Ships;
        const verticalKey = `v${id}` as keyof Ships;
        const coordinates = ships[coordKey] as Coord | undefined;
        const vertical = ships[verticalKey] as boolean;
        const ship = shipClassesLookup[id];

        if (coordinates && row === coordinates.y && col === coordinates.x) {
          return vertical ? ship.verticalClass : ship.horizontalClass;
        }
      }
      return '';
    }

    useEffect(() => {
      if (privateShips) setShipClass(getShipClass(privateShips));
      else if (publicShips) setShipClass(getShipClass(publicShips));
      else setShipClass('');
    }, [privateShips, publicShips]);

    const privateCells = privateShips ? getOccupiedCells(privateShips) : [];
    const publicCells = getOccupiedCells(publicShips);
    const cells = [...privateCells, ...publicCells];
    const isShipCell = cells.some((ship) => ship.x === col && ship.y === row);
    return (
      <Box
        key={`${rowIndex}-${colIndex}`}
        onMouseEnter={() => {
          handleMouseEnter(rowIndex, colIndex);
        }}
        onMouseLeave={handleMouseLeave}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1fr, 1fr)',
          width: '25px',
          height: '25px',
          position: 'relative',
          backgroundColor: cellValue === BOARD_STATE.ship_hit ? '#367c59' : cellColor,
          border: '1px solid #000',
          cursor: buttons && state[rowIndex][colIndex] === BOARD_STATE.empty ? 'pointer' : 'default',
        }}
        onClick={() => {
          handleCellClick(rowIndex, colIndex);
        }}
        className={shipClass}
      >
        <Box
          key={`col-label-${colIndex}`}
          sx={{
            width: '25px',
            height: '25px',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: '1px',
            paddingInlineEnd: '2px',
            color: cellValue === BOARD_STATE.ship_hit || isShipCell ? 'cornsilk' : '#000',
          }}
        >
          {cellNode}
        </Box>
      </Box>
    );
  };

  return (
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
      {/* Top-left empty corner */}
      <Box sx={{ width: '25px', height: '25px' }} />

      {Array.from({ length: 10 }).map((_, colIndex) => (
        <Box
          key={`col-label-${colIndex}`}
          sx={{
            width: '25px',
            height: '25px',
            fontWeight: 'bold',
          }}
        >
          {colIndex + 1}
        </Box>
      ))}

      {state.map((row, rowIndex) => (
        <>
          <Box
            key={`row-label-${rowIndex}`}
            sx={{
              width: '25px',
              height: '25px',
              fontWeight: 'bold',
            }}
          >
            {String.fromCharCode(65 + rowIndex)} {/* Convert index to A, B, C, ... */}
          </Box>

          {row.map((cell, colIndex) => toCellNode(rowIndex, colIndex, cell))}
        </>
      ))}
    </Box>
  );
};

export default BattleshipGameBoard;
