import { useContext } from 'react';
import { GameLocalStateProviderContext, type GameLocalState } from '../contexts';

export const useGameLocalState = (): GameLocalState => {
  const context = useContext(GameLocalStateProviderContext);

  if (!context) {
    throw new Error('A <GameLocalStateProvider /> is required.');
  }
  return context;
};
