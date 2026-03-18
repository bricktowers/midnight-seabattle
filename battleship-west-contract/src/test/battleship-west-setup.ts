import {
  type CircuitContext,
  type CircuitResults,
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
  rawTokenType,
  encodeRawTokenType,
  encodeContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import * as crypto from 'node:crypto';
import {
  type BattleshipPrivateState,
  westWitnesses,
  Contract,
  type Ledger,
  ledger,
  type Witnesses,
  type Coord,
  type Ships,
  type ShipState,
  type ShieldedCoinInfo,
} from '../index.js';

type BattleshipContract = Contract<BattleshipPrivateState, Witnesses<BattleshipPrivateState>>;

export const randomSk = (): Uint8Array => crypto.getRandomValues(Buffer.alloc(32));

function pad(s: string, n: number): Uint8Array {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(s);
  if (n < utf8Bytes.length) {
    throw new Error(`The padded length n must be at least ${utf8Bytes.length}`);
  }
  const paddedArray = new Uint8Array(n);
  paddedArray.set(utf8Bytes);
  return paddedArray;
}

export class BattleshipSimulator {
  readonly contract: BattleshipContract;
  userPrivateStates: Record<string, BattleshipPrivateState>;
  turnContext: CircuitContext<BattleshipPrivateState>;
  contractAddress: ReturnType<typeof sampleContractAddress>;
  updateUserPrivateState: (newPrivateState: BattleshipPrivateState) => void;

  constructor(privateState: BattleshipPrivateState) {
    this.contract = new Contract(westWitnesses);
    this.contractAddress = sampleContractAddress();
    const { currentPrivateState, currentContractState, currentZswapLocalState } = this.contract.initialState(
      createConstructorContext(privateState, '0'.repeat(64)),
      { bytes: encodeContractAddress(this.contractAddress) },
    );
    this.userPrivateStates = { ['p1']: currentPrivateState };
    this.turnContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.updateUserPrivateState = (newPrivateState: BattleshipPrivateState) => {};
  }

  static deployBattleshipContract(secretKey: Uint8Array, playerShipPositions: Ships): BattleshipSimulator {
    const saverPrivateState: BattleshipPrivateState = {
      localSecretKey: secretKey,
      playerShipPositions: playerShipPositions,
      playerShipState: undefined,
    };
    return new BattleshipSimulator(saverPrivateState);
  }

  private buildTurnContext(currentPrivateState: BattleshipPrivateState): CircuitContext<BattleshipPrivateState> {
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
    return ledger(this.turnContext.currentQueryContext.state);
  }

  getPrivateState(): BattleshipPrivateState {
    return this.turnContext.currentPrivateState;
  }

  private updateUserPrivateStateByName =
    (name: string) =>
    (newPrivateState: BattleshipPrivateState): void => {
      this.userPrivateStates[name] = newPrivateState;
    };

  as(name: string): BattleshipSimulator {
    this.turnContext = this.buildTurnContext(this.userPrivateStates[name]);
    this.updateUserPrivateState = this.updateUserPrivateStateByName(name);
    return this;
  }

  updateStateAndGetLedger<T>(circuitResults: CircuitResults<BattleshipPrivateState, T>): Ledger {
    this.turnContext = circuitResults.context;
    this.updateUserPrivateState(circuitResults.context.currentPrivateState);
    return this.getLedgerState();
  }

  coin(): ShieldedCoinInfo {
    return {
      nonce: randomSk(),
      color: encodeRawTokenType(rawTokenType(pad('brick_towers_coin', 32), this.contractAddress)),
      value: BigInt(100),
    };
  }

  join_p1(): Ledger {
    return this.updateStateAndGetLedger(this.contract.impureCircuits.join_p1(this.turnContext, this.coin()));
  }

  join_p1_with_coin(coinInfo: ShieldedCoinInfo): Ledger {
    return this.updateStateAndGetLedger(this.contract.impureCircuits.join_p1(this.turnContext, coinInfo));
  }

  join_p2(): Ledger {
    return this.updateStateAndGetLedger(this.contract.impureCircuits.join_p2(this.turnContext, this.coin()));
  }

  join_p2_with_coin(coinInfo: ShieldedCoinInfo): Ledger {
    return this.updateStateAndGetLedger(this.contract.impureCircuits.join_p2(this.turnContext, coinInfo));
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
