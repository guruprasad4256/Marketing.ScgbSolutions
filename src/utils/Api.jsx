import axios from 'axios';

const API_BASE_URL =
  import.meta.env.MODE === 'production'
    ? 'https://api.manhoursonhire.com'
    : 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // REQUIRED for cookies
});