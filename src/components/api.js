// api.js
import axios from 'axios';

// Create a custom Axios instance with a base URL
const instance = axios.create({
  baseURL: 'http://localhost:5000/api', // Set your backend base URL here
});

export default instance;
