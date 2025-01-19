import './globals';

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';

import { LottieLoader } from './LottieLoader';

const LazyApp = React.lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={<LottieLoader />}>
      <LazyApp />
    </Suspense>
  </React.StrictMode>,
);
