import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import React from 'react';
import { MainLayout } from './components';
import MyBattles from './MyBattles';
import { Game } from './components/Game';
import { Setup } from './components/Setup';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material';
import { theme } from './config/theme';
import { DeployedGameProvider, GameLocalStateProvider } from './contexts';
import { RuntimeConfigurationProvider, useRuntimeConfiguration } from './config/RuntimeConfiguration';
import { MidnightWalletProvider } from './components/MidnightWallet';
import * as pino from 'pino';
import { FAQ } from './components/FAQ';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

const AppWithLogger: React.FC = () => {
  const config = useRuntimeConfiguration();
  const logger = pino.pino({
    level: config.LOGGING_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  setNetworkId(config.NETWORK_ID as NetworkId);
  return (
    <GameLocalStateProvider logger={logger}>
      <MidnightWalletProvider logger={logger}>
        <DeployedGameProvider logger={logger}>
          <BrowserRouter basename={process.env.PUBLIC_URL}>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/faq" element={<FAQ />} />
                <Route path="/game/:contract" element={<Game />} />
                <Route path="/setup/:contract" element={<Setup logger={logger} />} />
                <Route index path="/" element={<MyBattles logger={logger} />} />
                <Route path="*" element={<Navigate to="/" replace={true} />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </DeployedGameProvider>
      </MidnightWalletProvider>
    </GameLocalStateProvider>
  );
};
const App: React.FC = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <CssBaseline />
      <RuntimeConfigurationProvider>
        <ThemeProvider theme={theme}>
          <AppWithLogger />
        </ThemeProvider>
      </RuntimeConfigurationProvider>
    </DndProvider>
  );
};

export default App;
