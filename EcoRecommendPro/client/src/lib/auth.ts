import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  gender: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  age: number;
  gender: string;
}

export const auth = {
  async login(data: LoginData): Promise<User> {
    const response = await apiRequest("POST", "/api/auth/login", data);
    return response.json();
  },

  async signup(data: SignupData): Promise<User> {
    const response = await apiRequest("POST", "/api/auth/signup", data);
    return response.json();
  },

  async logout(): Promise<void> {
    await apiRequest("POST", "/api/auth/logout");
  },

  async me(): Promise<User | null> {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      return response.json();
    } catch (error) {
      return null;
    }
  },
};
