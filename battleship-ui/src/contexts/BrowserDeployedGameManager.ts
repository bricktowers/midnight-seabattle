import { BattleshipAPI, type BattleshipProviders, type DeployedBattleshipAPI } from '@bricktowers/battleship-api';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { BehaviorSubject, type Observable } from 'rxjs';
import { type Logger } from 'pino';
import { type GameLocalState } from './BrowserGameLocalState';

export type GameType = 'recent' | 'youcouldjoin' | 'yours' | 'allOther';

export interface Game {
  readonly observable: BehaviorSubject<GameDeployment>;
  readonly gameType: GameType;
  address?: ContractAddress;
}

export interface InProgressGameDeployment {
  readonly status: 'in-progress';
  readonly address?: ContractAddress;
}

export interface DeployedGame {
  readonly status: 'deployed';
  readonly api: DeployedBattleshipAPI;
  readonly address: ContractAddress;
}

export interface FailedGameDeployment {
  readonly status: 'failed';
  readonly error: Error;
  readonly address?: ContractAddress;
}

export type GameDeployment = InProgressGameDeployment | DeployedGame | FailedGameDeployment;

export interface DeployedGameAPIProvider {
  readonly gameDeployments$: Observable<Game[]>;
  readonly addGame: (providers: BattleshipProviders, gameType: GameType, contractAddress: ContractAddress) => Game;
  readonly deployAndAddGame: (providers: BattleshipProviders, gameType: GameType) => Promise<Game>;
}

export class BrowserDeployedGameManager implements DeployedGameAPIProvider {
  readonly #boardDeploymentsSubject: BehaviorSubject<Game[]>;

  constructor(
    private readonly logger: Logger,
    private readonly localState: GameLocalState,
    private readonly tokenContractAddress: ContractAddress,
  ) {
    this.#boardDeploymentsSubject = new BehaviorSubject<Game[]>([]);
    this.gameDeployments$ = this.#boardDeploymentsSubject;
  }

  readonly gameDeployments$: Observable<Game[]>;

  addGame(providers: BattleshipProviders, gameType: GameType, contractAddress: ContractAddress): Game {
    const deployments = this.#boardDeploymentsSubject.value;

    const deployment = new BehaviorSubject<GameDeployment>({
      status: 'in-progress',
      address: contractAddress,
    });

    const game: Game = { observable: deployment, gameType, address: contractAddress };

    const deploymentsToKeep = deployments.filter(
      (deployment) => !(deployment.observable.value.address === contractAddress && deployment.gameType === gameType),
    );
    this.#boardDeploymentsSubject.next([...deploymentsToKeep, game]);
    void this.joinGame(providers, deployment, contractAddress);

    return game;
  }

  async deployAndAddGame(providers: BattleshipProviders, gameType: GameType): Promise<Game> {
    const deployments = this.#boardDeploymentsSubject.value;

    const deployment = new BehaviorSubject<GameDeployment>({
      status: 'in-progress',
    });

    const game: Game = { observable: deployment, gameType };

    this.#boardDeploymentsSubject.next([...deployments, game]);
    const address = await this.deployGame(providers, deployment);

    return { observable: deployment, gameType, address };
  }

  private async deployGame(
    providers: BattleshipProviders,
    deployment: BehaviorSubject<GameDeployment>,
  ): Promise<string | undefined> {
    try {
      const uuid: string = crypto.randomUUID();
      const api = await BattleshipAPI.deploy(uuid, this.tokenContractAddress, providers, this.logger);
      this.localState.setGameId(uuid, api.deployedContractAddress);
      this.localState.addGame(api.deployedContractAddress);

      deployment.next({
        status: 'deployed',
        api,
        address: api.deployedContractAddress,
      });
      return api.deployedContractAddress;
    } catch (error: unknown) {
      this.logger.error(error);
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
    return undefined;
  }

  private async joinGame(
    providers: BattleshipProviders,
    deployment: BehaviorSubject<GameDeployment>,
    contractAddress: ContractAddress,
  ): Promise<void> {
    try {
      let uuid: string = crypto.randomUUID();
      const item = this.localState.getGameId(contractAddress);
      if (item != null) {
        uuid = item;
      } else {
        this.localState.setGameId(uuid, contractAddress);
      }
      const api = await BattleshipAPI.subscribe(
        uuid,
        this.tokenContractAddress,
        providers,
        contractAddress,
        this.logger,
      );

      deployment.next({
        status: 'deployed',
        api,
        address: api.deployedContractAddress,
      });
    } catch (error: unknown) {
      this.logger.error(error);
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}
