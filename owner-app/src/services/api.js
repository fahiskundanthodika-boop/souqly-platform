// API service for owner app - all backend calls go through here
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your server's IP address when testing on phone
const API_URL = 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });

// Automatically attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('owner_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
