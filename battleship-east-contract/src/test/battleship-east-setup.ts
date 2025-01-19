import {
  CircuitContext,
  CircuitResults,
  constructorContext,
  QueryContext,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import * as crypto from 'node:crypto';
import {
  BattleshipEastPrivateState,
  eastWitnesses,
  Ledger,
  ledger,
  Witnesses,
  Coord,
  Ships,
  ShipState,
  Contract,
} from '../index.js';

type BattleshipContract = Contract<BattleshipEastPrivateState, Witnesses<BattleshipEastPrivateState>>;

export const randomSk = (): Uint8Array => crypto.getRandomValues(Buffer.alloc(32));

export class BattleshipSimulator {
  readonly contract: BattleshipContract;
  userPrivateStates: Record<string, BattleshipEastPrivateState>;
  turnContext: CircuitContext<BattleshipEastPrivateState>;
  updateUserPrivateState: (newPrivateState: BattleshipEastPrivateState) => void;

  constructor(privateState: BattleshipEastPrivateState) {
    this.contract = new Contract(eastWitnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } = this.contract.initialState(
      constructorContext(privateState, '0'.repeat(64)),
    );
    this.userPrivateStates = { ['p1']: currentPrivateState };
    this.turnContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(currentContractState.data, sampleContractAddress()),
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.updateUserPrivateState = (newPrivateState: BattleshipEastPrivateState) => {};
  }

  static deployBattleshipContract(secretKey: Uint8Array, playerShipPositions: Ships): BattleshipSimulator {
    const saverPrivateState: BattleshipEastPrivateState = {
      localSecretKey: secretKey,
      playerShipPositions: playerShipPositions,
      playerShipState: undefined,
    };
    return new BattleshipSimulator(saverPrivateState);
  }

  private buildTurnContext(currentPrivateState: BattleshipEastPrivateState): CircuitContext<BattleshipEastPrivateState> {
    return {
      ...this.turnContext,
      currentPrivateState,
    };
  }

  createPlayerPrivateState(
    playerName: string,
    secretKey: Uint8Array,
    playerShipPositions: Ships,
    playerShipState?: ShipState,
  ): void {
    this.userPrivateStates[playerName] = {
      localSecretKey: secretKey,
      playerShipPositions: playerShipPositions,
      playerShipState: playerShipState,
    };
  }

  getLedgerState(): Ledger {
    return ledger(this.turnContext.transactionContext.state);
  }

  getPrivateState(): BattleshipEastPrivateState {
    return this.turnContext.currentPrivateState;
  }

  private updateUserPrivateStateByName =
    (name: string) =>
    (newPrivateState: BattleshipEastPrivateState): void => {
      this.userPrivateStates[name] = newPrivateState;
    };

  as(name: string): BattleshipSimulator {
    this.turnContext = this.buildTurnContext(this.userPrivateStates[name]);
    this.updateUserPrivateState = this.updateUserPrivateStateByName(name);
    return this;
  }

  private updateStateAndGetLedger<T>(circuitResults: CircuitResults<BattleshipEastPrivateState, T>): Ledger {
    this.turnContext = circuitResults.context;
    this.updateUserPrivateState(circuitResults.context.currentPrivateState);
    return this.getLedgerState();
  }

  join_p1(): Ledger {
    return this.updateStateAndGetLedger(this.contract.impureCircuits.join_p1(this.turnContext));
  }

  join_p2(): Ledger {
    return this.updateStateAndGetLedger(this.contract.impureCircuits.join_p2(this.turnContext));
  }

  turn_player1(value: Coord): Ledger {
    const circuitResults = this.contract.impureCircuits.turn_player1(this.turnContext, value);
    return this.updateStateAndGetLedger(circuitResults);
  }

  turn_player2(value: Coord): Ledger {
    const circuitResults = this.contract.impureCircuits.turn_player2(this.turnContext, value);
    return this.updateStateAndGetLedger(circuitResults);
  }
}
