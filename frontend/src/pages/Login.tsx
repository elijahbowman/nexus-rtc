import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const Login: React.FC = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.BaseSyntheticEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/signin', formData);
            const token = response.data.token;
            localStorage.setItem('token', token);

            // Decode the token payload to fetch the logged-in user profile attributes
            const decoded: any = jwtDecode(token);

            // Store the user identity context attributes cleanly for sidebar consumption
            localStorage.setItem('username', decoded.sub);

            // If JWT payload doesn't map an 'id' yet, fall back to a mock identity counter 
            // or match against a custom claim. (Assume 'userId' or default integer context)
            const userId = decoded.userId;
            if (!userId) {
                console.error("Fatal: Security Token missing required contextual metadata assertions.");
            }
            localStorage.setItem('userId', String(userId));

            navigate('/chat');
        } catch (err: any) {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans">
            <div className="w-full max-w-md p-8 bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-extrabold text-indigo-400 tracking-tight">NexusRTC ☸️</h2>
                    <p className="text-sm text-[var(--theme-text-muted)]">Sign in to your synchronized multi-channel node</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)] px-1">Username</label>
                        <input
                            id="username"
                            autoComplete="username"
                            type="text"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-[var(--theme-text)] focus:outline-none transition-colors"
                            placeholder="Enter your handle"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)] px-1">Password</label>
                        <input
                            id="password"
                            autoComplete="current-password"
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
                        className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all transform active:scale-98 mt-2 text-[var(--theme-btn-text)]"
                    >
                        Authenticate Node
                    </button>
                </form>

                <p className="text-xs text-center text-[var(--theme-text-muted)]">
                    Need an account?{' '}
                    <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline transition-colors">
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
};


export default Login;
