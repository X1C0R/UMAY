// Storage utilities for token management
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@user_data';

/**
 * Store authentication token
 */
export async function storeToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
}

/**
 * Get authentication token
 */
export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

/**
 * Remove authentication token
 */
export async function removeToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
    throw error;
  }
}

/**
 * Store user data
 */
export async function storeUserData(userData: any): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error('Error storing user data:', error);
    throw error;
  }
}

/**
 * Get user data
 */
export async function getUserData(): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

