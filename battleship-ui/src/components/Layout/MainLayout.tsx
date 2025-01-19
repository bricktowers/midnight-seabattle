import React from 'react';
import { Box, Typography } from '@mui/material';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';

export const MainLayout: React.FC = () => {
  return (
    <Box sx={{ background: '#0F2830', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1 }}>
        <Header />
        <Box sx={{ position: 'relative', height: '100%' }}>
          <Box
            sx={{
              zIndex: 999,
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              gap: '5px',
              rowGap: '5px',
              alignItems: 'center',
              height: '100%',
              px: { xs: 2, sm: 5 },
              py: { xs: 1, sm: 3 },
            }}
          >
            {<Outlet />}
          </Box>
        </Box>
      </Box>
      <Box
        component="footer"
        sx={{
          textAlign: 'center',
          py: 1,
          borderTop: '1px solid cornsilk',
        }}
      >
        <Typography variant="body2" color="cornsilk">
          © {new Date().getFullYear()} Brick Towers AG. All rights reserved. Check out our website at{' '}
          <Box
            component="a"
            href="https://bricktowers.io/"
            target="_blank"
            rel="noreferrer"
            sx={{
              color: 'cornsilk',
              textDecoration: 'underline',
            }}
          >
            bricktowers.io
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};
