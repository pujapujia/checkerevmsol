import { useState, useEffect } from 'react';
import 'tailwindcss/tailwind.css';

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    const errorHandler = (error) => {
      console.error('[ERROR] Global error:', error);
      setHasError(true);
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);
  if (hasError) return <h1 className="text-white text-center mt-10">Something went wrong. Check console.</h1>;
  return children;
}

function App() {
  const [chains, setChains] = useState({
    arb: false,
    eth: false,
    bnb: false,
    avax: false,
    poly: false,
    base: false,
    sol: false,
    optimism: false,
    sepolia: false,
    bsc_testnet: false,
    mumbai: false,
    fuji: false
  });
  const [walletInput, setWalletInput] = useState('');
  const [contractInput, setContractInput] = useState('');
  const [savedWallets, setSavedWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('wallets') || '[]');
    const wallets = saved.map((addr, i) => ({ address: addr, name: `Wallet ${i + 1}` }));
    setSavedWallets(wallets);
    console.log('[INFO] Loaded wallets from localStorage:', wallets);
  }, []);

  const handleChainChange = (chain) => {
    setChains({ ...chains, [chain]: !chains[chain] });
  };

  const saveWallets = () => {
    const walletList = walletInput
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w && !savedWallets.some((sw) => sw.address.toLowerCase() === w.toLowerCase()));
    const newWallets = walletList.map((addr, i) => ({
      address: addr,
      name: `Wallet ${savedWallets.length + i + 1}`
    }));
    const updatedWallets = [...savedWallets, ...newWallets];
    setSavedWallets(updatedWallets);
    localStorage.setItem('wallets', JSON.stringify(updatedWallets.map((w) => w.address)));
    console.log('[INFO] Saved wallets to localStorage:', updatedWallets);
    setWalletInput('');
  };

  const deleteWallet = (address) => {
    const updatedWallets = savedWallets
      .filter((w) => w.address.toLowerCase() !== address.toLowerCase())
      .map((w, i) => ({ ...w, name: `Wallet ${i + 1}` }));
    setSavedWallets(updatedWallets);
    localStorage.setItem('wallets', JSON.stringify(updatedWallets.map((w) => w.address)));
    console.log('[INFO] Deleted wallet:', address, 'New wallets:', updatedWallets);
    if (selectedWallet?.toLowerCase() === address.toLowerCase()) {
      setSelectedWallet(null);
      setBalances([]);
    }
  };

  const fetchWithRetry = async (url, retries = 5, delay = 2000) => {
    console.log('[INFO] Fetching:', url);
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, {
          mode: 'cors',
          signal: AbortSignal.timeout(30000),
          headers: { 'Accept': 'application/json' }
        });
        const responseText = await res.text().catch(() => 'No response text');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${responseText}`);
        }
        console.log('[SUCCESS] Fetch successful:', url, 'Response:', responseText);
        return JSON.parse(responseText);
      } catch (error) {
        console.log(`[ERROR] Fetch attempt ${i + 1} failed:`, error.message);
        if (i < retries - 1) {
          console.log(`[INFO] Retrying after ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  };

  const checkBalance = async (walletAddr) => {
    setSelectedWallet(walletAddr);
    setLoading(true);
    setError('');
    const selectedChains = Object.keys(chains).filter((c) => chains[c]);
    if (selectedChains.length === 0) {
      setError('Pilih minimal satu jaringan!');
      setLoading(false);
      return;
    }
    const contractList = contractInput.split('\n').map((c) => c.trim()).filter((c) => c);
    const results = [];

    for (const chain of selectedChains) {
      try {
        const contractsParam = contractList.length > 0 ? `&contracts=${contractList.join(',')}` : '';
        const url = `https://checkerevmsol-backend.vercel.app/getBalance?address=${walletAddr}&network=${chain}${contractsParam}`;
        const data = await fetchWithRetry(url);
        if (data.error) throw new Error(data.error);
        const walletName = savedWallets.find((w) => w.address.toLowerCase() === walletAddr.toLowerCase())?.name || `Wallet ${walletAddr.slice(0, 6)}`;
        results.push({ wallet: walletAddr, walletName, chain, ...data });
        console.log('[SUCCESS] Balance fetched for', walletAddr, chain);
      } catch (error) {
        const walletName = savedWallets.find((w) => w.address.toLowerCase() === walletAddr.toLowerCase())?.name || `Wallet ${walletAddr.slice(0, 6)}`;
        results.push({ wallet: walletAddr, walletName, chain, error: error.message });
        setError(`Gagal fetch data untuk ${chain}: ${error.message}`);
        console.log('[ERROR] Balance fetch failed for', walletAddr, chain, ':', error.message);
      }
    }

    setBalances(results);
    setLoading(false);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-white font-mono flex">
        <div className="w-64 bg-gray-800 p-4 h-screen overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Wallet Tersimpan</h2>
          <textarea
            className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-500 transition duration-200"
            rows="3"
            placeholder="Masukkan alamat wallet baru"
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
          />
          <button
            className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-500 transition duration-200 mb-4"
            onClick={saveWallets}
          >
            Simpan Wallet
          </button>
          {savedWallets.length === 0 ? (
            <p className="text-gray-400">Belum ada wallet tersimpan.</p>
          ) : (
            savedWallets.map((wallet) => (
              <div
                key={wallet.address}
                className="flex items-center justify-between p-2 mb-2 rounded-lg cursor-pointer transition duration-200 hover:bg-gray-700"
              >
                <div
                  className={`flex-1 ${selectedWallet?.toLowerCase() === wallet.address.toLowerCase() ? 'bg-gray-600' : ''}`}
                  onClick={() => checkBalance(wallet.address)}
                >
                  <p className="text-gray-300 break-all">{wallet.name}</p>
                  <p className="text-sm text-gray-400 break-all">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</p>
                </div>
                <button
                  className="ml-2 text-red-400 hover:text-red-300"
                  onClick={() => deleteWallet(wallet.address)}
                >
                  X
                </button>
              </div>
            ))
          )}
        </div>
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Balance Checker</h1>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {['arb', 'eth', 'bnb', 'avax', 'poly', 'base', 'sol', 'optimism', 'sepolia', 'bsc_testnet', 'mumbai', 'fuji'].map((chain) => (
              <label key={chain} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={chains[chain]}
                  onChange={() => handleChainChange(chain)}
                  className="h-5 w-5 text-gray-600 rounded focus:ring-gray-500"
                />
                <span className="uppercase text-sm text-gray-300">{chain}</span>
              </label>
            ))}
          </div>
          <hr className="my-6 border-gray-700" />
          <textarea
            className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-500 transition duration-200"
            rows="3"
            placeholder="Masukkan alamat kontrak custom (opsional)"
            value={contractInput}
            onChange={(e) => setContractInput(e.target.value)}
          />
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            {balances.length === 0 && <p className="text-gray-400">Pilih wallet untuk cek saldo.</p>}
            {loading && <p className="text-gray-400">Memuat...</p>}
            {balances.map((b, i) => (
              <div key={i} className="mb-4 animate-fade-in">
                <p><strong>Jaringan:</strong> <span className="text-gray-300">{b.chain.toUpperCase()}</span></p>
                <p><strong>Wallet:</strong> <span className="text-gray-300 break-all">{b.walletName} ({b.wallet})</span></p>
                {b.error ? (
                  <p><strong>Error:</strong> <span className="text-red-400">{b.error}</span></p>
                ) : (
                  <>
                    <p><strong>Saldo Native:</strong> <span className="text-gray-300">{b.native} {b.chain === 'sol' ? 'SOL' : b.chain === 'poly' ? 'MATIC' : b.chain.toUpperCase()}</span></p>
                    <p><strong>Token:</strong></p>
                    <ul className="list-disc pl-5">
                      {b.tokens.length > 0 ? (
                        b.tokens.map((t, j) => (
                          <li key={j} className="text-gray-300">- {t.name}: {t.balance}</li>
                        ))
                      ) : (
                        <li className="text-gray-400">Tidak ada token terdeteksi</li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
