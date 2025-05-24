import { useState, useEffect } from 'react';
import 'tailwindcss/tailwind.css';

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    const errorHandler = (error) => {
      console.error(error);
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
    sol: false
  });
  const [walletInput, setWalletInput] = useState('');
  const [contractInput, setContractInput] = useState('');
  const [wallets, setWallets] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
    setWallets(savedWallets);
    if (savedWallets.length > 0) {
      fetchBalances(savedWallets);
    }
  }, []);

  const handleChainChange = (chain) => {
    setChains({ ...chains, [chain]: !chains[chain] });
  };

  const saveWallets = async () => {
    setLoading(true);
    const walletList = walletInput.split('\n').map(w => w.trim()).filter(w => w);
    setWallets(walletList);
    localStorage.setItem('wallets', JSON.stringify(walletList));
    await fetchBalances(walletList);
    setLoading(false);
  };

  const fetchBalances = async (walletList) => {
    const selectedChains = Object.keys(chains).filter(c => chains[c]);
    const contractList = contractInput.split('\n').map(c => c.trim()).filter(c => c);
    const results = [];

    for (const wallet of walletList) {
      for (const chain of selectedChains) {
        try {
          const contractsParam = contractList.length > 0 ? `&contracts=${contractList.join(',')}` : '';
          const res = await fetch(`https://checkerevmsol-e8j2.vercel.app/getBalance?address=${wallet}&network=${chain}${contractsParam}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          results.push({ wallet, chain, ...data });
        } catch (error) {
          results.push({ wallet, chain, error: error.message });
        }
      }
    }

    setBalances(results);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-white p-6 font-mono">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-center">Balance Checker</h1>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {['arb', 'eth', 'bnb', 'avax', 'poly', 'base', 'sol'].map(chain => (
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
            rows="5"
            placeholder="Masukkan alamat wallet, satu per baris"
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
          />
          <textarea
            className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-500 transition duration-200"
            rows="3"
            placeholder="Masukkan alamat kontrak custom (opsional), satu per baris"
            value={contractInput}
            onChange={(e) => setContractInput(e.target.value)}
          />
          <button
            className={`w-full bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={saveWallets}
            disabled={loading}
          >
            {loading ? 'Memuat...' : 'Simpan & Cek Saldo'}
          </button>
          <hr className="my-6 border-gray-700" />
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            {balances.length === 0 && <p className="text-gray-400">Belum ada data saldo.</p>}
            {balances.map((b, i) => (
              <div key={i} className="mb-4 animate-fade-in">
                <p><strong>Jaringan:</strong> <span className="text-gray-300">{b.chain.toUpperCase()}</span></p>
                <p><strong>Wallet:</strong> <span className="text-gray-300 break-all">{b.wallet}</span></p>
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
