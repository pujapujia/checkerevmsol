const express = require('express');
const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Accept'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));
app.use(express.json());

// Log request dan response
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[INFO] Request: ${req.method} ${req.url}, Headers:`, req.headers);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[INFO] Response: ${req.method} ${req.url}, Status: ${res.statusCode}, Duration: ${duration}ms`);
  });
  next();
});

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
  bsc: ['https://bsc-dataseed1.binance.org/', 'https://rpc.ankr.com/bsc'],
  avax: ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'],
  matic: ['https://rpc-mainnet.maticvigil.com', 'https://rpc.ankr.com/polygon', 'https://polygon-rpc.com'],
  base: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
  eth: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
  optimism: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
  arbitrum: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
  sepolia: ['https://rpc.sepolia.org', 'https://rpc.ankr.com/eth_sepolia'],
  bsc_testnet: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  mumbai: ['https://rpc-mumbai.matic.today'],
  fuji: ['https://api.avax-test.network/ext/bc/C/rpc'],
  sol: ['https://api.mainnet-beta.solana.com', 'https://rpc.ankr.com/solana']
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
        console.log(`[SUCCESS] Connected to RPC: ${url} (attempt ${attempt})`);
        return provider;
      } catch (error) {
        console.log(`[ERROR] Failed RPC ${url} for ${mappedNetwork} (attempt ${attempt}):`, error.message);
        continue;
      }
    }
    if (attempt < retries) {
      console.log(`[INFO] Retrying provider for ${mappedNetwork}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`No available RPC for ${mappedNetwork} after ${retries} retries`);
};

// Ping endpoint
app.get('/ping', (req, res) => {
  console.log('[INFO] Ping requested');
  res.status(200).json({ status: 'OK', message: 'Backend alive', timestamp: new Date().toISOString() });
});

// Health check
app.get('/health', (req, res) => {
  console.log('[INFO] Health check requested');
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Status endpoint (cek semua chain)
app.get('/status', async (req, res) => {
  console.log('[INFO] Status requested');
  const results = {};
  for (const network of Object.keys(networkMap)) {
    try {
      const provider = await getProvider(network);
      const block = await provider.getBlockNumber();
      results[network] = { status: 'OK', block };
    } catch (error) {
      results[network] = { status: 'ERROR', error: error.message };
    }
  }
  res.status(200).json(results);
});

// Debug endpoint
app.get('/debug', async (req, res) => {
  const { address = '0xB78eB3BbD7F072009E20692af45c4B82a13e4033', network = 'base' } = req.query;
  console.log(`[INFO] Debug requested: address=${address}, network=${network}`);
  try {
    const provider = await getProvider(network);
    const block = await provider.getBlockNumber();
    const balance = await provider.getBalance(address);
    res.status(200).json({ status: 'OK', network, block, native: ethers.formatEther(balance) });
  } catch (error) {
    console.log(`[ERROR] Debug failed:`, error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.get('/getBalance', async (req, res) => {
  const { address, network, contracts } = req.query;
  console.log(`[INFO] Balance requested: address=${address}, network=${network}, contracts=${contracts}`);

  try {
    if (!address || !network) {
      console.log('[ERROR] Missing address or network');
      throw new Error('Missing address or network');
    }

    let nativeBalance;

    if (network === 'sol') {
      let solanaConnection;
      for (const url of rpcUrls.sol) {
        try {
          solanaConnection = new Connection(url, 'confirmed');
          await solanaConnection.getBalance(new PublicKey(address));
          console.log(`[SUCCESS] Connected to Solana RPC: ${url}`);
          break;
        } catch (error) {
          console.log(`[ERROR] Failed Solana RPC ${url}:`, error.message);
          continue;
        }
      }
      if (!solanaConnection) throw new Error('No available Solana RPC');

      const publicKey = new PublicKey(address);
      nativeBalance = await solanaConnection.getBalance(publicKey);
      const result = { native: nativeBalance / 1e9, tokens: [] };
      console.log(`[SUCCESS] Balance for ${address} on sol:`, JSON.stringify(result));
      return res.json(result);
    }

    const provider = await getProvider(network);
    nativeBalance = await provider.getBalance(address);
    const result = { native: ethers.formatEther(nativeBalance), tokens: [] };
    console.log(`[SUCCESS] Balance for ${address} on ${network}:`, JSON.stringify(result));
    res.json(result);
  } catch (error) {
    console.log(`[ERROR] getBalance failed for address=${address}, network=${network}:`, error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3001, () => console.log('[INFO] Server jalan'));
