import React from 'react';
import { Box, Typography } from '@mui/material';

export const MidnightLaceWalletInstall: React.FC = () => {
  return (
    <div>
      <Typography variant="caption" paragraph color={'cornsilk'}>
        If you don’t already have the <b>Midnight Lace Wallet</b> installed, follow the instructions on the{' '}
        <Box
          component="a"
          href={'https://docs.midnight.network/develop/tutorial/using/chrome-ext'}
          target="_blank"
          rel="noreferrer"
          sx={{
            color: 'cornsilk',
            textDecoration: 'underline',
          }}
        >
          Midnight Lace Wallet Installation Page
        </Box>
        .
      </Typography>

      <Typography variant="caption" paragraph color={'cornsilk'}>
        <b>Configuring the Proof Server Address</b>
        <br />
        To function correctly, the Midnight Lace Wallet requires <b>a proof server address</b>. <br />
        If you don’t have your own proof server yet, you can use the one provided by <b>Brick Towers</b> (please review
        the privacy considerations noted on the Lace instructions page). <br />
        1. Open the <b>Settings</b> in your Lace Wallet. <br />
        2. Set the proof server address to: <br />
        <b>https://brick-towers-proof-server.testnet.midnight.solutions</b> <br />
      </Typography>

      <Typography variant="caption" color={'cornsilk'}>
        <b>Enhancing Your Gaming Experience</b> <br />
        For an improved gaming experience, you can optionally use the Brick Towers Midnight Node and Indexer in your
        Midnight Lace Wallet:
        <br />
        Node Address: <br />
        <b>https://rpc.testnet.midnight.solutions</b>
        <br />
        Indexer Address: <br />
        <b>https://indexer.testnet.midnight.solutions</b>
      </Typography>
    </div>
  );
};
