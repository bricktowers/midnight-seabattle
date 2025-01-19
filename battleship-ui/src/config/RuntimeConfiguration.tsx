import React, { createContext, useContext, useEffect, useState } from 'react';

export interface RuntimeConfiguration {
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY: string;
  FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY: string;
  LOGGING_LEVEL: string;
  BRICK_TOWERS_TOKEN_ADDRESS: string;
  NETWORK_ID: string;
  PUBLIC_URL: string;
  INDEXER_URI: string;
  INDEXER_WS_URI: string;
}

const RuntimeConfigurationContext = createContext<RuntimeConfiguration | null>(null);

export const useRuntimeConfiguration = (): RuntimeConfiguration => {
  const configuration = useContext(RuntimeConfigurationContext);
  if (!configuration) {
    throw new Error('Configuration not loaded');
  }
  return configuration;
};

interface RuntimeConfigurationProviderProps {
  children: React.ReactNode;
}

/**
 * Loads runtime configuration from static file (in /public folder).
 */
export const loadRuntimeConfiguration = async (): Promise<RuntimeConfiguration> => {
  const response = await fetch('/config.json');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const value: Record<string, string> = await response.json();

  return {
    FIREBASE_API_KEY: value.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: value.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: value.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: value.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: value.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: value.FIREBASE_APP_ID,
    FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY: value.FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY,
    FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY: value.FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY,
    BRICK_TOWERS_TOKEN_ADDRESS: value.BRICK_TOWERS_TOKEN_ADDRESS,
    LOGGING_LEVEL: value.LOGGING_LEVEL,
    NETWORK_ID: value.NETWORK_ID,
    PUBLIC_URL: value.PUBLIC_URL,
    INDEXER_URI: value.INDEXER_URI,
    INDEXER_WS_URI: value.INDEXER_WS_URI,
  };
};

export const RuntimeConfigurationProvider: React.FC<RuntimeConfigurationProviderProps> = ({ children }) => {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfiguration | null>(null);

  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      const loadedConfig = await loadRuntimeConfiguration();
      setRuntimeConfig(loadedConfig);
    };
    void loadConfig();
  }, []);

  return (
    <RuntimeConfigurationContext.Provider value={runtimeConfig}>
      {runtimeConfig ? children : <div>Loading configuration...</div>}
    </RuntimeConfigurationContext.Provider>
  );
};
