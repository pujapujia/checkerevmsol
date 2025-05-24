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

const popularTokens = {
  eth: [
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'USDT' },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'DAI' }
  ],
  avax: [
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', name: 'USDC' }
  ],
  bnb: [
    { address: '0x55d398326f99059fF775485246999027B3197955', name: 'USDT' }
  ],
  base: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USDC' }
  ],
  poly: [
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', name: 'USDT' }
  ],
  arb: [
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', name: 'USDT' }
  ]
};

app.get('/getBalance', async (req, res) => {
  const { address, network } = req.query;

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
      const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGK7N6')
      });
      const tokens = tokenAccounts.value.map(acc => ({
        name: 'Token',
        balance: acc.account.data.parsed.info.tokenAmount.uiAmount
      }));

      return res.json({
        native: nativeBalance / 1e9,
        tokens
      });
    }

    const provider = await getProvider(network);
    const nativeBalance = await provider.getBalance(address);
    const tokens = [];

    for (const token of popularTokens[network] || []) {
      try {
        const contract = new ethers.Contract(token.address, tokenAbi, provider);
        const balance = await contract.balanceOf(address);
        const decimals = await contract.decimals();
        const name = token.name || (await contract.name());
        tokens.push({
          name,
          balance: ethers.formatUnits(balance, decimals)
        });
      } catch {
        continue;
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
