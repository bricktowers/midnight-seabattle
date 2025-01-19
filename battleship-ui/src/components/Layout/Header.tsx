import React from 'react';
import { AppBar, Box } from '@mui/material';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => (
  <AppBar
    position="static"
    data-testid="header"
    sx={{
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      px: 10,
      py: 2, // Add vertical padding
    }}
  >
    {/* Left-aligned logo */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
      }}
      data-testid="header-logo-left"
    >
      <Link to={'/'}>
        <img src="/brick-towers-logo.png" alt="logo-image" height={66} />
      </Link>
    </Box>

    {/* Right-aligned logo */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
      }}
      data-testid="header-logo-right"
    >
      <img src="/midnight-logo.png" alt="logo-image" height={66} />
    </Box>
  </AppBar>
);
