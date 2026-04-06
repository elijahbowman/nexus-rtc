import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.BaseSyntheticEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/signin', formData);
            localStorage.setItem('token', response.data.token);
            navigate('/chat');
        } catch (err: any) {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-discord-black">
            <form onSubmit={handleLogin} className="w-96 rounded-lg bg-discord-dark p-8 shadow-xl">
                <h2 className="mb-2 text-center text-2xl font-bold">Welcome back!</h2>
                <p className="mb-6 text-center text-discord-gray">We're so excited to see you again!</p>

                {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

                <label className="mb-2 block text-xs font-bold uppercase text-discord-gray">Username</label>
                <input
                    type="text"
                    className="mb-4 w-full rounded bg-black p-2 focus:ring-2 focus:ring-discord-blue focus:outline-none"
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                />

                <label className="mb-2 block text-xs font-bold uppercase text-discord-gray">Password</label>
                <input
                    type="password"
                    className="mb-6 w-full rounded bg-black p-2 focus:ring-2 focus:ring-discord-blue focus:outline-none"
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                />

                <button className="w-full rounded bg-discord-blue py-2 font-bold transition hover:bg-opacity-90">
                    Log In
                </button>

                <p className="mt-4 text-sm text-discord-gray">
                    Need an account? <Link to="/register" className="text-blue-400 hover:underline">Register</Link>
                </p>
            </form>
        </div>
    );
};

export default Login;
