import { useState } from 'react';
import TrailRunnerCoach from './TrailRunnerCoach'; // Your main app component

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Set your password here - in production, use environment variable
  const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'your-secure-password';

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
      // Store in session so you don't have to re-login on refresh
      sessionStorage.setItem('authenticated', 'true');
    } else {
      setError('Incorrect password');
    }
  };

  // Check if already authenticated in this session
  useState(() => {
    if (sessionStorage.getItem('authenticated') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-8 border border-slate-700 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Trail Running Coach
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">
                Enter Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Password"
                autoFocus
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <TrailRunnerCoach />;
}

export default App;
