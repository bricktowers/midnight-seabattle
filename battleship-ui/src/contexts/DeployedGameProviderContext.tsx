import React, { createContext, type PropsWithChildren } from 'react';
import { BrowserDeployedGameManager, type DeployedGameAPIProvider } from './BrowserDeployedGameManager';
import { type Logger } from 'pino';
import { useGameLocalState } from '../hooks/useGameLocalState';
import { useRuntimeConfiguration } from '../config/RuntimeConfiguration';

export const DeployedGameProviderContext = createContext<DeployedGameAPIProvider | undefined>(undefined);

export type DeployedGameProviderProps = PropsWithChildren<{
  logger: Logger;
}>;

export const DeployedGameProvider: React.FC<Readonly<DeployedGameProviderProps>> = ({ logger, children }) => {
  const localState = useGameLocalState();
  const config = useRuntimeConfiguration();
  return (
    <DeployedGameProviderContext.Provider
      value={new BrowserDeployedGameManager(logger, localState, config.BRICK_TOWERS_TOKEN_ADDRESS)}
    >
      {children}
    </DeployedGameProviderContext.Provider>
  );
};
