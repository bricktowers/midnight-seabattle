import type { Logger } from 'pino';
import type { DAppConnectorAPI, DAppConnectorWalletAPI, ServiceUriConfig } from '@midnight-ntwrk/dapp-connector-api';
import { concatMap, filter, firstValueFrom, interval, map, of, take, tap, throwError, timeout } from 'rxjs';
import { pipe as fnPipe } from 'fp-ts/function';
import semver from 'semver';

export const connectToWallet = (
  logger: Logger,
): Promise<{ wallet: DAppConnectorWalletAPI; uris: ServiceUriConfig }> => {
  const COMPATIBLE_CONNECTOR_API_VERSION = '1.x';

  return firstValueFrom(
    fnPipe(
      interval(100),
      map(() => window.midnight?.mnLace),
      tap((connectorAPI) => {
        logger.info(connectorAPI, 'Check for wallet connector API');
      }),
      filter((connectorAPI): connectorAPI is DAppConnectorAPI => !!connectorAPI),
      concatMap((connectorAPI) =>
        semver.satisfies(connectorAPI.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION)
          ? of(connectorAPI)
          : throwError(() => {
              logger.error(
                {
                  expected: COMPATIBLE_CONNECTOR_API_VERSION,
                  actual: connectorAPI.apiVersion,
                },
                'Incompatible version of wallet connector API',
              );

              return new Error(
                `Incompatible version of Midnight Lace wallet found. Require '${COMPATIBLE_CONNECTOR_API_VERSION}', got '${connectorAPI.apiVersion}'.`,
              );
            }),
      ),
      tap((connectorAPI) => {
        logger.info(connectorAPI, 'Compatible wallet connector API found. Connecting.');
      }),
      take(1),
      timeout({
        first: 1_000,
        with: () =>
          throwError(() => {
            logger.error('Could not find wallet connector API');

            return new Error('Could not find Midnight Lace wallet. Extension installed?');
          }),
      }),
      concatMap(async (connectorAPI) => {
        const isEnabled = await connectorAPI.isEnabled();

        logger.info(isEnabled, 'Wallet connector API enabled status');

        return connectorAPI;
      }),
      timeout({
        first: 5_000,
        with: () =>
          throwError(() => {
            logger.error('Wallet connector API has failed to respond');
            return new Error('Midnight Lace wallet has failed to respond. Extension enabled?');
          }),
      }),
      concatMap(async (connectorAPI) => {
        try {
          return {
            walletConnectorAPI: await connectorAPI.enable(),
            connectorAPI,
          };
        } catch (e) {
          logger.error('Unable to enable connector API');
          throw new Error('Application is not authorized');
        }
      }),
      concatMap(async ({ walletConnectorAPI, connectorAPI }) => {
        const uris = await connectorAPI.serviceUriConfig();

        logger.info('Connected to wallet connector API and retrieved service configuration');

        return { wallet: walletConnectorAPI, uris };
      }),
    ),
  );
};
