import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config/urls';

const instance = axios.create({
    baseURL: API_URL
});

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default instance;
