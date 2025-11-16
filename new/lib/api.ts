// API Configuration and utilities
// For mobile/emulator testing, use your computer's IP address instead of localhost
// Get your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)

// Update this IP address to match your computer's local IP address
// You can find it by running: ipconfig (Windows) or ifconfig (Mac/Linux)
const LOCAL_IP = '192.168.100.66';

const getApiBaseUrl = () => {
  // Allow environment variable override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Use local IP for development (works for mobile/emulator)
  // For web, you can change this to 'http://localhost:4000'
  return `http://${LOCAL_IP}:4000`;
};

const API_BASE_URL = getApiBaseUrl();

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  preferredLanguage: string;
  learningStyle: string;
  message: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

/**
 * Login API call
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    // Handle network errors
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || `Login failed: ${response.status}`);
    }

    const data = await response.json();
    return data as LoginResponse;
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error(
        `Cannot connect to server at ${API_BASE_URL}. Make sure the server is running and the IP address is correct.`
      );
    }
    throw error;
  }
}

/**
 * Register API call
 */
export async function register(userData: {
  email: string;
  password: string;
  fullName: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  learningStyle?: string;
  date_of_birth?: string;
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || `Registration failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error(
        `Cannot connect to server at ${API_BASE_URL}. Make sure the server is running and the IP address is correct.`
      );
    }
    throw error;
  }
}

/**
 * Get user profile
 */
export async function getProfile(token: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || `Failed to fetch profile: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error(
        `Cannot connect to server at ${API_BASE_URL}. Make sure the server is running and the IP address is correct.`
      );
    }
    throw error;
  }
}

