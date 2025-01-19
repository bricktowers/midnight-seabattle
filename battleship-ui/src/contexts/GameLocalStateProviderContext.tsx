import React, { createContext, type PropsWithChildren } from 'react';
import { BrowserGameLocalState, type GameLocalState } from './BrowserGameLocalState';
import { type Logger } from 'pino';

export const GameLocalStateProviderContext = createContext<GameLocalState | undefined>(undefined);

export type GameLocalStateProviderProps = PropsWithChildren<{
  logger: Logger;
}>;

export const GameLocalStateProvider: React.FC<Readonly<GameLocalStateProviderProps>> = ({ children, logger }) => {
  return (
    <GameLocalStateProviderContext.Provider value={new BrowserGameLocalState(logger)}>
      {children}
    </GameLocalStateProviderContext.Provider>
  );
};
