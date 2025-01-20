
# Challenges and Workarounds in Implementation

## Resolving Proof Server Issues with Board Representation
We initially implemented the board using `Uint<0..9>`, but encountered bugs in the proof server. 
After investigation, we discovered that using `Uint<4>` or other `Uint<n..m>` types, where `m` is 
a power of 2, resolved the issues with the proof server.

## Efficient Ship Placement Validation in Compact Mode
Ship coordinates are stored using the top-left cell, size, and orientation (vertical or horizontal).
During setup, the smart contract calculates all ship coordinates based on user input. These must be 
unique and non-overlapping per game rules.

Typically, uniqueness would be enforced with a `Set`, but in compact mode, `Set` is only available 
as a Ledger ADT. Using it could expose ship positions, even if the state resets after the check. 
As a performance workaround, we perform direct pairwise comparisons, with a maximum of 
(17 × 16) / 2 = 136 checks, ensuring both rule compliance and confidentiality.

## Managing Private State with `privateStateProvider` Interface
To securely manage private state values, we leverage the `local_secret_key` witness, similar
to the approach used in the bulletin board example. The hash of this key acts as the user's
public key, enabling consistent grouping of all games under the same user. Consequently, the
same secret key is reused across games. The `battleship-api` module contains specialized
logic to initialize the private state under the key `initial` and subsequently reuse this
secret key for every new game. This design simplifies user grouping but requires careful
handling to maintain security.

## Enhanced User Feedback via Private APIs
Providing a seamless and responsive user experience is critical for the game. To achieve
this, we examined existing Midnight APIs and implementations and created wrappers for them.
These wrappers improve feedback during critical processes, such as proof generation,
transaction signing via Midnight Lace Wallet, and transaction submission and indexing.
While this approach significantly enhances user experience by keeping users informed about
progress and potential issues in real time, it also introduces a dependency on the internal
implementation details of these APIs. This reliance on internal details is not ideal from a
design perspective, but it effectively solves the problem of delivering a better user
experience in the short term.

## Addressing Transient Failures in Public Providers
The public provider, which interacts with an indexer, is prone to transient failures
that can disrupt operations. Without robust error handling, these failures can cause
subsequent calls to fail, leading to a cascade of issues. To mitigate this, we
implemented retry logic for calls to the indexer, ensuring greater resilience and
reducing the impact of temporary disruptions.

## Infrastructure Instability
Initially, our goal was to deliver a playable game with a smooth user experience.
However, as we began testing our solution on the TestNet, we encountered significant
performance challenges with the provided infrastructure.
The long wait times for block finalization rendered the game unplayable.
Due to limited documentation, we undertook the task of running the node
and indexer ourselves to investigate the issues. This led to two key discoveries:

**Node Challenges**: The delays were caused by an implementation issue in the
node, causing chain to fork, which requires a fix from the Midnight team.
Unfortunately, there was nothing we could do to resolve it.

**Indexer Challenges**: The indexer also presented problems, including excessive
memory usage leading to crashes, single-CPU utilization, and extremely slow
synchronization, taking days to sync with a node on the same machine.
Also not much we can do without access to the source code.

We are now eagerly awaiting updates and fixes from the Midnight team to continue
our journey on the TestNet.

---
# Observations and Feedback

## Risk of Verifier/Prover/ZKIR File Clashes
The current approach copies verifier, prover, and ZKIR files from the compact compiler
output to the public UI folder to make them accessible to users. However, this introduces
the potential for file clashes when multiple contracts are hosted in the same environment.
A more robust file-naming strategy or directory segregation is needed to prevent conflicts.

## Recovery Challenges with Transient Failures and Browser Reloads
Transient failures in the public provider can cause the game to freeze, with no
recovery mechanism in place. Moreover, if the game is reloaded, the private game
state is lost, making recovery impossible. This issue stems from limitations in
the private implementation of transaction submission. Below is an example
illustrating the challenge:

@midnight-ntwrk/midnight-js-contracts:
```typescript
const unprovenCallTxData = await createUnprovenCallTx(providers.publicDataProvider, providers.privateStateProvider, providers.walletProvider, options);
const finalizedTxData = await submitTx(providers, {
  unprovenTx: unprovenCallTxData.private.unprovenTx,
  newCoins: unprovenCallTxData.private.newCoins,
  circuitId: options.circuitId
});
if (finalizedTxData.status !== SucceedEntirely) {
  throw new CallTxFailedError(finalizedTxData, options.circuitId);
}
await providers.privateStateProvider.set(options.privateStateKey, unprovenCallTxData.private.nextPrivateState);
```
A solution may involve designing a more robust state recovery mechanism. An approach could
involve making the state recovery process dependent on feedback from the indexer to determine
if the transaction was successfully processed. Specifically, the private state should account
for transactions that were submitted but have not yet received feedback from the indexer.
By integrating this dependency into the state, the system can better handle cases where
feedback is delayed or temporarily unavailable, ensuring smoother recovery and continuity of the game.

### Trust Assumptions in Game Deployment and Token Address
Currently, during game deployment, a token address is provided as part of the game's
constructor. This setup relies on the trust assumption that users will not override
the token address with one under their control. To address this vulnerability, the
system should allow contracts to call other contracts directly, enabling stronger
enforcement of token address integrity and reducing reliance on user honesty.

### Public Provider API
Currently, the Public Provider API is quite limited and lacks access to some functionality
that is already implemented. For instance, block watching via WebSocket, which we rely on for
the indexer, is not exposed. To work around this, we had to extract the necessary queries
directly from the code. A more comprehensive API for interacting with the indexer would
significantly enhance usability and streamline development.
