const express = require('express');
const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const rpcUrls = {
  eth: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com'
  ],
  avax: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche-c-chain.publicnode.com'
  ],
  bnb: [
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
    'https://rpc.ankr.com/bsc'
  ],
  base: [
    'https://mainnet.base.org',
    'https://rpc.ankr.com/base',
    'https://base.publicnode.com'
  ],
  poly: [
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://poly-mainnet.gateway.pokt.network/v1/lb/123'
  ],
  arb: [
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.publicnode.com'
  ],
  sol: [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.g.alchemy.com/v2/demo'
  ]
};

const tokenAbi = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)'
];

const getProvider = async (network) => {
  for (const url of rpcUrls[network]) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber();
      return provider;
    } catch {
      continue;
    }
  }
  throw new Error(`No available RPC for ${network}`);
};

app.get('/getBalance', async (req, res) => {
  const { address, network, contracts } = req.query;

  try {
    if (network === 'sol') {
      let solanaConnection;
      for (const url of rpcUrls.sol) {
        try {
          solanaConnection = new Connection(url, 'confirmed');
          await solanaConnection.getBalance(new PublicKey(address));
          break;
        } catch {
          continue;
        }
      }
      if (!solanaConnection) throw new Error('No available Solana RPC');

      const publicKey = new PublicKey(address);
      const nativeBalance = await solanaConnection.getBalance(publicKey);
      const tokens = [];
      
      if (contracts) {
        const contractList = contracts.split(',');
        const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGK7N6')
        });
        for (const acc of tokenAccounts.value) {
          const info = acc.account.data.parsed.info;
          if (contractList.includes(info.mint)) {
            tokens.push({
              name: 'Token',
              balance: info.tokenAmount.uiAmount
            });
          }
        }
      }

      return res.json({
        native: nativeBalance / 1e9,
        tokens
      });
    }

    const provider = await getProvider(network);
    const nativeBalance = await provider.getBalance(address);
    const tokens = [];

    if (contracts) {
      const contractList = contracts.split(',');
      for (const contractAddress of contractList) {
        try {
          const contract = new ethers.Contract(contractAddress, tokenAbi, provider);
          const balance = await contract.balanceOf(address);
          const decimals = await contract.decimals();
          const name = await contract.name().catch(() => 'Unknown');
          const symbol = await contract.symbol().catch(() => 'Unknown');
          tokens.push({
            name: name || symbol || 'Unknown',
            balance: ethers.formatUnits(balance, decimals)
          });
        } catch {
          continue;
        }
      }
    }

    res.json({
      native: ethers.formatEther(nativeBalance),
      tokens
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3001, () => console.log('Server jalan'));
