import axios from 'axios';
import { API_URL } from './serverUrl';

const API = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default API;
