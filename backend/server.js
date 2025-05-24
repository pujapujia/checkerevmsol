const express = require('express');
const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*' })); // Wildcard buat debug, ganti ke spesifik kalau stabil
app.use(express.json());

const networkMap = {
  poly: 'matic',
  bnb: 'bsc',
  arb: 'arbitrum',
  eth: 'eth',
  avax: 'avax',
  base: 'base',
  sol: 'sol',
  optimism: 'optimism',
  sepolia: 'sepolia',
  bsc_testnet: 'bsc_testnet',
  mumbai: 'mumbai',
  fuji: 'fuji'
};

const rpcUrls = {
  bsc: [
    'https://bsc-dataseed1.binance.org/',
    'https://rpc.ankr.com/bsc',
    'https://bsc.publicnode.com'
  ],
  avax: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche.public-rpc.com'
  ],
  matic: [
    'https://rpc-mainnet.maticvigil.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon-rpc.com',
    'https://poly-mainnet.rpc.grove.city/v1/803a2461',
    'https://polygon-mainnet.public.blastapi.io',
    'https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY', // Ganti kalau punya
    'https://polygon-mainnet.g.alchemy.com/v2/demo',
    'https://matic-mainnet.chainstacklabs.com'
  ],
  base: [
    'https://mainnet.base.org',
    'https://base-rpc.publicnode.com',
    'https://base.publicnode.com'
  ],
  eth: [
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
    'https://eth.llamarpc.com'
  ],
  optimism: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://optimism.publicnode.com'
  ],
  arbitrum: [
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.publicnode.com'
  ],
  sepolia: [
    'https://rpc.sepolia.org',
    'https://rpc.ankr.com/eth_sepolia'
  ],
  bsc_testnet: [
    'https://data-seed-prebsc-1-s1.binance.org:8545/',
    'https://rpc.ankr.com/bsc_testnet'
  ],
  mumbai: [
    'https://rpc-mumbai.matic.today',
    'https://rpc.ankr.com/polygon_mumbai'
  ],
  fuji: [
    'https://api.avax-test.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche_fuji'
  ],
  sol: [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana'
  ]
};

const explorers = {
  bsc: 'https://api.bscscan.com/api',
  avax: 'https://api.snowtrace.io/api',
  matic: 'https://api.polygonscan.com/api',
  base: 'https://api.basescan.org/api',
  eth: 'https://api.etherscan.io/api',
  optimism: 'https://api-optimistic.etherscan.io/api',
  arbitrum: 'https://api.arbiscan.io/api',
  sepolia: 'https://api-sepolia.etherscan.io/api',
  bsc_testnet: 'https://api-testnet.bscscan.com/api',
  mumbai: 'https://api-mumbai.polygonscan.com/api',
  fuji: 'https://testnet.snowtrace.io/api'
};

const apiKeys = {
  bsc: ['5DKFJ6AWWNQU7H766PGCCKPTXS32EYHE8M'],
  avax: ['YOUR_SNOWTRACE_API_KEY_1'],
  matic: [
    'KQ43QA1YT3A6F2DPXHAY899SQVVXS8PX1K',
    'EB22YZFWMJVNC6EF19E8TH3U6H5DJXPWW6',
    'AHBV45FUNR5J7VSTZG19ZX17HFN2NMB38H'
  ],
  base: ['FGRE5HU4K36ZQMFPX84W35YH1K7UJC4R62'],
  eth: ['IHINXYAP9Y5RI529JZD8DDN78GPZVVMIK8'],
  optimism: ['3CBBEGR1XXWSHMI97NZWDUBCZX87EMUBH9'],
  arbitrum: ['GAER9RIXRQKB91U8JBMW6Z1WK7Z7EN6DMF'],
  sepolia: ['IHINXYAP9Y5RI529JZD8DDN78GPZVVMIK8'],
  bsc_testnet: ['5DKFJ6AWWNQU7H766PGCCKPTXS32EYHE8M'],
  mumbai: ['KQ43QA1YT3A6F2DPXHAY899SQVVXS8PX1K'],
  fuji: ['YOUR_FUJI_SNOWTRACE_API_KEY_1']
};

const tokenAbi = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() view returns (string)'
];

const popularTokens = {
  eth: [
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'USDT' },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', name: 'USDC' }
  ],
  avax: [
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', name: 'USDC' }
  ],
  bsc: [
    { address: '0x55d398326f99059fF775485246999027B3197955', name: 'USDT' }
  ],
  base: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USDC' }
  ],
  matic: [
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', name: 'USDT' },
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', name: 'USDC' },
    { address: '0xf19C89D844745B9910882A64b65aa4cb44DF492d', name: 'FAN' }
  ],
  arbitrum: [
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', name: 'USDT' }
  ]
};

const getProvider = async (network, retries = 3) => {
  const mappedNetwork = networkMap[network] || network;
  const urls = rpcUrls[mappedNetwork] || [];
  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const url of urls) {
      try {
        const provider = new ethers.JsonRpcProvider(url);
        await Promise.race([
          provider.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`RPC timeout: ${url}`)), 5000))
        ]);
        console.log(`Connected to RPC: ${url} (attempt ${attempt})`);
        return provider;
      } catch (error) {
        console.log(`Failed RPC ${url} for ${mappedNetwork} (attempt ${attempt}):`, error.message);
        continue;
      }
    }
    if (attempt < retries) {
      console.log(`Retrying provider for ${mappedNetwork}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`No available RPC for ${mappedNetwork} after ${retries} retries`);
};

const getApiKey = (network) => {
  const mappedNetwork = networkMap[network] || network;
  const keys = apiKeys[mappedNetwork] || [];
  return keys[Math.floor(Math.random() * keys.length)] || '';
};

const getTokensFromExplorer = async (network, address) => {
  const mappedNetwork = networkMap[network] || network;
  const explorerUrl = explorers[mappedNetwork];
  const apiKey = getApiKey(network);
  if (!explorerUrl || !apiKey) {
    console.log(`No explorer or API key for ${mappedNetwork}`);
    return [];
  }

  try {
    const provider = await getProvider(network);
    const tokens = [];
    const response = await axios.get(explorerUrl, {
      params: {
        module: 'account',
        action: 'tokentx',
        address,
        page: 1,
        offset: 50, // Batasi buat cegah timeout
        sort: 'desc',
        apikey: apiKey
      },
      timeout: 10000
    });

    console.log(`Polygonscan response for ${address} on ${mappedNetwork}:`, response.data.status);

    if (response.data.status === '1' && response.data.result) {
      const tokenContracts = new Set();
      for (const tx of response.data.result) {
        if (tx.tokenSymbol && !tokenContracts.has(tx.contractAddress)) {
          tokenContracts.add(tx.contractAddress);
          try {
            const contract = new ethers.Contract(tx.contractAddress, tokenAbi, provider);
            const balance = await contract.balanceOf(address);
            const decimals = await contract.decimals();
            const balanceFormatted = ethers.formatUnits(balance, decimals);
            if (parseFloat(balanceFormatted) > 0) {
              const name = await contract.name().catch(() =>
                contract.symbol().catch(() => tx.contractAddress.slice(0, 6))
              );
              tokens.push({
                name,
                balance: balanceFormatted
              });
            }
          } catch (error) {
            console.log(`Error querying token ${tx.contractAddress} for ${address}:`, error.message);
            continue;
          }
        }
      }
    } else {
      console.log(`Polygonscan failed for ${address}:`, response.data.message);
    }
    return tokens;
  } catch (error) {
    console.log(`Error fetching tokens from ${mappedNetwork} explorer for ${address}:`, error.message);
    return [];
  }
};

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/test', async (req, res) => {
  try {
    const provider = await getProvider('poly');
    const block = await provider.getBlockNumber();
    res.status(200).json({ status: 'OK', network: 'poly', block });
  } catch (error) {
    console.log('Test endpoint error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/getBalance', async (req, res) => {
  const { address, network, contracts } = req.query;
  console.log(`Request received: address=${address}, network=${network}, contracts=${contracts}`);

  try {
    if (!address || !network) {
      throw new Error('Missing address or network');
    }

    if (network === 'sol') {
      let solanaConnection;
      for (const url of rpcUrls.sol) {
        try {
          solanaConnection = new Connection(url, 'confirmed');
          await solanaConnection.getBalance(new PublicKey(address));
          break;
        } catch (error) {
          console.log(`Failed Solana RPC ${url}:`, error.message);
          continue;
        }
      }
      if (!solanaConnection) throw new Error('No available Solana RPC');

      const publicKey = new PublicKey(address);
      const nativeBalance = await solanaConnection gimnasio.getBalance(publicKey);
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
    let tokens = [];

    // Get tokens from explorer
    tokens = await getTokensFromExplorer(network, address);

    // Check popular tokens
    const mappedNetwork = networkMap[network] || network;
    const chainTokens = popularTokens[mappedNetwork] || [];
    for (const token of chainTokens) {
      if (!tokens.some((t) => t.name === token.name)) {
        try {
          const contract = new ethers.Contract(token.address, tokenAbi, provider);
          const balance = await contract.balanceOf(address);
          const decimals = await contract.decimals();
          const balanceFormatted = ethers.formatUnits(balance, decimals);
          if (parseFloat(balanceFormatted) > 0) {
            tokens.push({
              name: token.name,
              balance: balanceFormatted
            });
          }
        } catch (error) {
          console.log(`Error querying popular token ${token.name} at ${token.address}:`, error.message);
          continue;
        }
      }
    }

    // Check custom contracts
    if (contracts) {
      const contractList = contracts.split(',');
      console.log(`Processing custom contracts: ${contractList}`);
      for (const contractAddress of contractList) {
        try {
          const contract = new ethers.Contract(contractAddress, tokenAbi, provider);
          const balance = await contract.balanceOf(address);
          const decimals = await contract.decimals();
          const balanceFormatted = ethers.formatUnits(balance, decimals);
          if (parseFloat(balanceFormatted) > 0) {
            const name = await contract.name().catch(() =>
              contract.symbol().catch(() => contractAddress.slice(0, 6))
            );
            if (!tokens.some((t) => t.name === name)) {
              tokens.push({
                name,
                balance: balanceFormatted
              });
            }
          }
        } catch (error) {
          console.log(`Error querying custom contract ${contractAddress}:`, error.message);
          continue;
        }
      }
    }

    res.json({
      native: ethers.formatEther(nativeBalance),
      tokens
    });
  } catch (error) {
    console.log(`Error in getBalance for address=${address}, network=${network}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3001, () => console.log('Server jalan'));
