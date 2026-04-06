// Add the 'type' keyword here
import axios, { type InternalAxiosRequestConfig } from 'axios';

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
});

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default instance;
