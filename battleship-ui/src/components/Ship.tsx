import React from 'react';
import { Box } from '@mui/material';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDrag } from 'react-dnd';
import { type ShipClass } from './Setup';

export interface ShipProps {
  name: string;
  size: number;
  vertical: boolean;
  onClick?: () => void;
}

export interface ShipItem {
  size: number;
  vertical: boolean;
  name: string;
}

export const shipClassesLookup: Record<string, ShipClass> = {
  '21': { verticalClass: 'ship2vertical', horizontalClass: 'ship2horizontal' },
  '31': { verticalClass: 'ship3vertical', horizontalClass: 'ship3horizontal' },
  '32': { verticalClass: 'ship3vertical', horizontalClass: 'ship3horizontal' },
  '41': { verticalClass: 'ship4vertical', horizontalClass: 'ship4horizontal' },
  '51': { verticalClass: 'ship5vertical', horizontalClass: 'ship5horizontal' },
};

export const Ship: React.FC<Readonly<ShipProps>> = ({ size, vertical, name, onClick }) => {
  const item: ShipItem = { size, vertical, name };

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: 'ship',
      item,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [size, vertical, name],
  );

  let template = `repeat(${size}, 1fr)`;
  if (vertical) {
    template = `repeat(1fr, ${size})`;
  }

  function getShipClass(name: string, vertical: boolean): string {
    const ship = shipClassesLookup[name];
    return ship ? (vertical ? ship.verticalClass : ship.horizontalClass) : '';
  }

  return (
    <div>
      <Box
        ref={dragRef}
        sx={{
          display: 'grid',
          gridTemplateColumns: template,
          gap: '2px',
          width: 'fit-content',
          overflow: 'visible',
          margin: 'unset',
          position: 'relative',
          opacity: isDragging ? 0.5 : 1,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        className={getShipClass(name, vertical)}
        onClick={onClick}
      >
        {Array.from({ length: size }).map((_, colIndex) => (
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
        ))}
      </Box>
    </div>
  );
};
