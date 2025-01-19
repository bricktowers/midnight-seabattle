import { useContext } from 'react';
import { DeployedGameProviderContext, type DeployedGameAPIProvider } from '../contexts';

export const useDeployedGameContext = (): DeployedGameAPIProvider => {
  const context = useContext(DeployedGameProviderContext);

  if (!context) {
    throw new Error('A <DeployedGameProvider /> is required.');
  }

  return context;
};
