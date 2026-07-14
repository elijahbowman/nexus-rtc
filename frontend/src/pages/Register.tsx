import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/signup', formData);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data || 'Registration failed');
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans">
      <div className="w-full max-w-md p-8 bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-indigo-400 tracking-tight">NexusRTC ☸️</h2>
          <p className="text-sm text-[var(--theme-text-muted)]">Register a new profile node</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)] px-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-[var(--theme-text)] focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)] px-1">Username</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-[var(--theme-text)] focus:outline-none transition-colors"
              placeholder="Choose a handle"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)] px-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-[var(--theme-text)] focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-rose-400 text-xs px-1 text-center font-medium animate-pulse">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all transform active:scale-98 mt-2 cursor-pointer text-[var(--theme-btn-text)]"
          >
            Create Account
          </button>
        </form>

        <p className="text-xs text-center text-[var(--theme-text-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline transition-colors">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
