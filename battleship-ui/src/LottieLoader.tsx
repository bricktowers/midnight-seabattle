import React from 'react';
import animation from './brick_towers_lottie.json';
import Lottie from 'lottie-react';
import { Box } from '@mui/material';

export const LottieLoader: React.FC = () => {
  return (
    <Box sx={{ background: '#0F2830', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1 }}>
        <Lottie animationData={animation} loop={true}></Lottie>
      </Box>
    </Box>
  );
};
