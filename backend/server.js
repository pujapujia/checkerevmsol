const express = require('express');
const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const rpcUrls = {
  bsc: [
    'https://bsc-dataseed1.binance.org/',
    'https://rpc.ankr.com/bsc',
    'https://bsc.publicnode.com',
    'https://bsc-dataseed2.binance.org/',
    'https://bsc-dataseed3.binance.org/'
  ],
  avax: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche.public-rpc.com',
    'https://avalanche-c-chain.publicnode.com',
    'https://rpc.ankr.com/avalanche-c'
  ],
  matic: [
    'https://rpc-mainnet.maticvigil.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon-rpc.com',
    'https://polygon-mainnet.g.alchemy.com/v2/demo',
    'https://rpc-mainnet.matic.quiknode.pro'
  ],
  base: [
    'https://mainnet.base.org',
    'https://base-rpc.publicnode.com',
    'https://base.publicnode.com',
    'https://base-mainnet.g.alchemy.com/v2/demo',
    'https://rpc.ankr.com/base-mainnet'
  ],
  eth: [
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
    'https://eth.llamarpc.com',
    'https://mainnet.infura.io/v3/YOUR_INFURA_KEY', // Ganti kalau punya
    'https://eth-mainnet.g.alchemy.com/v2/demo'
  ],
  optimism: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://optimism.publicnode.com',
    'https://optimism-mainnet.g.alchemy.com/v2/demo',
    'https://rpc.ankr.com/optimism-mainnet'
  ],
  arbitrum: [
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.publicnode.com',
    'https://arbitrum-mainnet.g.alchemy.com/v2/demo',
    'https://rpc.ankr.com/arbitrum-mainnet'
  ],
  sepolia: [
    'https://rpc.sepolia.org',
    'https://rpc.ankr.com/eth_sepolia',
    'https://sepolia.infura.io/v3/YOUR_INFURA_KEY' // Ganti kalau punya
  ],
  bsc_testnet: [
    'https://data-seed-prebsc-1-s1.binance.org:8545/',
    'https://rpc.ankr.com/bsc_testnet',
    'https://bsc-testnet.publicnode.com'
  ],
  mumbai: [
    'https://rpc-mumbai.matic.today',
    'https://rpc.ankr.com/polygon_mumbai',
    'https://mumbai.polygonscan.com'
  ],
  fuji: [
    'https://api.avax-test.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche_fuji',
    'https://avalanche-fuji-c-chain.publicnode.com'
  ],
  sol: [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.g.alchemy.com/v2/demo',
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana-mainnet'
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
  bsc: [
    '5DKFJ6AWWNQU7H766PGCCKPTXS32EYHE8M',
    'GEJUTZUV2C459NTIA3Y3WRFVJXY3D4C2AH',
    '8NDC7ERUFFHRTXEVRSXKCNKHN58XHFURV8'
  ],
  avax: ['YOUR_SNOWTRACE_API_KEY_1'], // Ganti kalau punya
  matic: [
    'KQ43QA1YT3A6F2DPXHAY899SQVVXS8PX1K',
    'EB22YZFWMJVNC6EF19E8TH3U6H5DJXPWW6',
    'AHBV45FUNR5J7VSTZG19ZX17HFN2NMB38H'
  ],
  base: [
    'FGRE5HU4K36ZQMFPX84W35YH1K7UJC4R62',
    '8WI3VT5TNSSZXMIZYVMV58JR4RNH3CT4EF',
    'NKDY3JVWJQNFJ1YVQC2Y98IWUAY5MZAQWS'
  ],
  eth: [
    'IHINXYAP9Y5RI529JZD8DDN78GPZVVMIK8',
    'WR938Y1T2ZQRECGU7Z6RE4QS2KYWTFCWZI',
    'MC9J5KA65J3KPVZTFMHYGS1G2NZ51KNWSV'
  ],
  optimism: [
    '3CBBEGR1XXWSHMI97NZWDUBCZX87EMUBH9',
    'QZEQXKC6SK4UM61KC7DC6YAR9X5KVVJ3PY',
    'Z22XIPRPN29JETAQ3V9KKRPPGZFS9W116N'
  ],
  arbitrum: [
    'GAER9RIXRQKB91U8JBMW6Z1WK7Z7EN6DMF',
    'R62Z8DZRW82GU8SFD3WRCP1ZYFC768A64M',
    'VPW6J45IRU7RQXYGYNUIR3632T2SJMXVC8'
  ],
  sepolia: ['IHINXYAP9Y5RI529JZD8DDN78GPZVVMIK8'],
  bsc_testnet: ['5DKFJ6AWWNQU7H766PGCCKPTXS32EYHE8M'],
  mumbai: ['KQ43QA1YT3A6F2DPXHAY899SQVVXS8PX1K'],
  fuji: ['YOUR_FUJI_SNOWTRACE_API_KEY_1'] // Ganti kalau punya
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
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'DAI' },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', name: 'USDC' }
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
  matic: [
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', name: 'USDT' },
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', name: 'USDC' }
  ],
  arbitrum: [
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', name: 'USDT' }
  ]
};

const getProvider = async (network) => {
  for (const url of rpcUrls[network]) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), 5000))
      ]);
      console.log(`Connected to RPC: ${url}`);
      return provider;
    } catch (error) {
      console.log(`Failed RPC ${url} for ${network}:`, error.message);
      continue;
    }
  }
  throw new Error(`No available RPC for ${network}`);
};

const getApiKey = (network) => {
  const keys = apiKeys[network] || [];
  return keys[Math.floor(Math.random() * keys.length)] || '';
};

const getTokensFromExplorer = async (network, address) => {
  const explorerUrl = explorers[network];
  const apiKey = getApiKey(network);
  if (!explorerUrl || !apiKey) return [];

  try {
    const provider = await getProvider(network);
    const tokens = [];
    const response = await axios.get(explorerUrl, {
      params: {
        module: 'account',
        action: 'tokentx',
        address,
        page: 1,
        offset: 100,
        sort: 'desc',
        apikey: apiKey
      },
      timeout: 10000
    });

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
            console.log(`Error querying explorer token ${tx.contractAddress}:`, error.message);
            continue;
          }
        }
      }
    }
    return tokens;
  } catch (error) {
    console.log(`Error fetching tokens from ${network} explorer:`, error.message);
    return [];
  }
};

app.get('/getBalance', async (req, res) => {
  const { address, network, contracts } = req.query;
  console.log(`Received: address=${address}, network=${network}, contracts=${contracts}`);

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
    let tokens = [];

    // Get tokens from explorer
    tokens = await getTokensFromExplorer(network, address);

    // Check popular tokens (fallback)
    const chainTokens = popularTokens[network] || [];
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
    console.log('Error in getBalance:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3001, () => console.log('Server jalan'));
