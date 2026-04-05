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
    <div className="flex h-screen items-center justify-center bg-discord-black">
      <form onSubmit={handleSubmit} className="w-96 rounded-lg bg-discord-dark p-8 shadow-xl">
        <h2 className="mb-6 text-center text-2xl font-bold">Create an account</h2>
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        
        <label className="mb-2 block text-xs font-bold uppercase text-discord-gray">Email</label>
        <input 
          type="email" 
          className="mb-4 w-full rounded bg-black p-2 focus:ring-2 focus:ring-discord-blue focus:outline-none"
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required 
        />

        <label className="mb-2 block text-xs font-bold uppercase text-discord-gray">Username</label>
        <input 
          type="text" 
          className="mb-4 w-full rounded bg-black p-2 focus:ring-2 focus:ring-discord-blue focus:outline-none"
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          required 
        />

        <label className="mb-2 block text-xs font-bold uppercase text-discord-gray">Password</label>
        <input 
          type="password" 
          className="mb-6 w-full rounded bg-black p-2 focus:ring-2 focus:ring-discord-blue focus:outline-none"
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required 
        />

        <button className="w-full rounded bg-discord-blue py-2 font-bold transition hover:bg-opacity-90">
          Continue
        </button>

        <p className="mt-4 text-sm text-discord-gray">
          Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Log In</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
