import { useState, useEffect } from 'react';
import 'tailwindcss/tailwind.css';

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
    const results = [];

    for (const wallet of walletList) {
      for (const chain of selectedChains) {
        try {
          const res = await fetch(`https://checkerevmsol.vercel.app/getBalance?address=${wallet}&network=${chain}`);
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
    <div className="p-4 max-w-4xl mx-auto font-sans">
      <div className="flex flex-wrap gap-4 mb-4">
        {['arb', 'eth', 'bnb', 'avax', 'poly', 'base', 'sol'].map(chain => (
          <label key={chain} className="flex items-center">
            <input
              type="checkbox"
              checked={chains[chain]}
              onChange={() => handleChainChange(chain)}
              className="mr-2"
            />
            <span className="uppercase">{chain}</span>
          </label>
        ))}
      </div>
      <hr className="my-4 border-gray-300" />
      <textarea
        className="w-full p-2 font-mono bg-gray-100 border rounded mb-4"
        rows="5"
        placeholder="Paste wallet address(es) here, one per line"
        value={walletInput}
        onChange={(e) => setWalletInput(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={saveWallets}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Save & Cek Saldo'}
      </button>
      <hr className="my-4 border-gray-300" />
      <div className="font-mono bg-gray-100 p-4 rounded">
        {balances.map((b, i) => (
          <div key={i} className="mb-4">
            <p><strong>Jaringan:</strong> {b.chain.toUpperCase()}</p>
            <p><strong>Wallet:</strong> {b.wallet}</p>
            {b.error ? (
              <p><strong>Error:</strong> {b.error}</p>
            ) : (
              <>
                <p><strong>Saldo Native:</strong> {b.native}</p>
                <p><strong>Token:</strong></p>
                <ul>
                  {b.tokens.map((t, j) => (
                    <li key={j}>- {t.name}: {t.balance}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
