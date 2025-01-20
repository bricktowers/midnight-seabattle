import React from 'react';
import { Box, Typography } from '@mui/material';

export const FAQ: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'transparent', color: 'cornsilk', margin: '32px 32px 32px 32px' }}>
      <Typography align="center" variant="h2" color="primary.dark">
        Frequently Asked Questions
      </Typography>
      <ul style={{ listStyleType: 'none', fontSize: '13px', padding: 0 }}>
        <li style={{ marginBottom: '16px' }}>
          <strong>Q: What do I need to start playing?</strong>
          <p>
            A: You need to have a Chrome Browser with the {' '}
            <Box
              component="a"
              href="https://docs.midnight.network/develop/tutorial/using/chrome-ext"
              target="_blank"
              rel="noreferrer"
              sx={{
                color: 'cornsilk',
                textDecoration: 'underline',
              }}
            >
              Midnight Lace Wallet plugin installed
            </Box>{' '}
            and set up with the proof server address. You can play the game in your browser without any additional
            installations. You need to have some tDUST tokens to in your wallet to sign the game transactions. You need
            to have some tBTC tokens in your wallet to contribute to the game prize pool.
          </p>
        </li>
        <li style={{ marginBottom: '16px' }}>
          <strong>Q: Which proof server should I use in my Midnight Lace Wallet?</strong>
          <p>
            A: For the highest level of privacy you would want to run and secure your own proof server. If you don&#39;t
            have your own proof server, you can use the one provided by Brick Towers. Go to the Settings of your Lace
            Wallet and set the proof server address to{' '}
            <pre>https://brick-towers-proof-server.testnet.midnight.solutions</pre>
          </p>
        </li>
        <li style={{ marginBottom: '16px' }}>
          <strong>Q: What to do when I get &#34;UNKNOWN ERROR&#34; while trying to connect a wallet?</strong>
          <p>
            A: There are sometimes still intermittent errors in the test infrastructure. Double check if you have
            correctly set up the wallet and try reloading the page.
          </p>
        </li>
        <li style={{ marginBottom: '16px' }}>
          <strong>Q: How can I play with my friends?</strong>
          <p>
            A: Your friends can discover games which are awaiting a second player in the &#34;Sea Battles you could
            join&#34; section on the main page. You can also share the game link of a game you created with your friend
            for them to join or observe a game.
          </p>
        </li>
        <li style={{ marginBottom: '16px' }}>
          <strong>Q: What are the game rules?</strong>
          <p>
            A: The game is played on a 10x10 grid. Each player has 5 ships: Carrier (5 cells), Battleship (4 cells),
            Cruiser (3 cells), Submarine (3 cells), and Destroyer (2 cells). The players take turns to shoot at the
            opponent&#39;s grid. The game ends when all the cells of one player&#39;s ships are hit.
          </p>
        </li>
        <li style={{ marginBottom: '16px' }}>
          <strong>Q: Why the game is so slow?</strong>
          <p>
            A: The Midnight Network has just recently reached the TestNet phase. The Midnight team has been focusing on
            delivering the functionality and security first. The performance optimizations are possible in different
            components like the proof server, blockchain indexer, network bandwidth consumed, etc. and will be released
            in the upcoming versions.
          </p>
        </li>
        <li style={{ marginBottom: '16px' }}>
          <strong>Q: What is private and what is public in the game?</strong>
          <p>
            A: The game is designed to keep your ship locations private. The game fairness is ensured by the Midnight
            Network verifying Zero Knowledge proofs. Only the publicly announced actions like the shots made, and the
            shot results acknowledged by the opponent are stored on the Midnight Network, while the ship locations are
            never shared with anyone.
          </p>
        </li>
        <li style={{ marginBottom: '16px' }}>
          <strong>
            Q: Why does Midnight Lace Wallet display &#34;insufficient balance of token 91a4&#34; (or another token
            identifier) when joining a game?
          </strong>
          <p>
            A: To play the game, you must have <strong>100 tBTC tokens</strong>. You can mint these tokens directly from
            the main page by clicking the <strong>&#39;MINT ME tBTC&#39;</strong> button. Once the minting process is
            successful, Midnight Lace Wallet will prompt you to assign a name to the minted token. After assigning a
            name, you should see the name instead of the token identifier.
          </p>
        </li>
        <li style={{ marginBottom: '16px' }}>
          <strong>Q: Why does it take so long for &#34;transaction finalization&#34; on the blockchain?</strong>
          <p>
            A: Currently, the network experiences occasional <strong>forking issues due to known bugs</strong>. Your
            transaction might end up on a forked chain, which can delay finalization. If this happens, refresh your
            browser and try the transaction again.
          </p>
        </li>
        <li>
          <strong>Q: Why are my tokens marked as &#34;pending&#34; making transactions impossible?</strong>
          <p>
            A: This issue occurs when the wallet detects that the transaction has not been finalized on the blockchain
            but has already reserved tokens for it. To resolve this, click on <strong>&#34;resync state&#34;</strong>{' '}
            located next to your wallet status. This will refresh the wallet and resolve the issue.
          </p>
        </li>
      </ul>
    </div>
  );
};
