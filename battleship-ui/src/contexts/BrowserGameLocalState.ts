import type { Logger } from 'pino';

export interface GameLocalState {
  readonly setGameId: (gameId: string, contract: string) => void;
  readonly setLaceAutoConnect: (value: boolean) => void;
  readonly isLaceAutoConnect: () => boolean;
  readonly addGame: (contract: string) => void;
  readonly getGames: () => string[];
  readonly getGameId: (contract: string) => string | null;
}

export class BrowserGameLocalState implements GameLocalState {
  constructor(private readonly logger: Logger) {}

  isLaceAutoConnect(): boolean {
    return window.localStorage.getItem('brick_towers_midnight_lace_connect') === 'true';
  }

  setLaceAutoConnect(value: boolean): void {
    this.logger.trace(`Setting lace auto connect to ${value}`);
    window.localStorage.setItem('brick_towers_midnight_lace_connect', value.toString());
  }

  addGame(contract: string): void {
    this.logger.trace(`Adding game ${contract}`);
    const item = window.localStorage.getItem('brick_towers_games');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const games: string[] = item ? JSON.parse(item) : [];
    const updatedGames = Array.from(new Set([...games, contract]));
    window.localStorage.setItem('brick_towers_games', JSON.stringify(updatedGames));
  }

  getGames(): string[] {
    const item = window.localStorage.getItem('brick_towers_games');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const games: string[] = item ? JSON.parse(item) : [];
    return Array.from<string>(new Set([...games]));
  }

  getGameId(contract: string): string | null {
    return window.localStorage.getItem('brick_towers_contract_' + contract);
  }

  setGameId(gameId: string, contract: string): void {
    this.logger.trace(`Setting game id ${gameId} for contract ${contract}`);
    window.localStorage.setItem('brick_towers_contract_' + contract, gameId);
  }
}
