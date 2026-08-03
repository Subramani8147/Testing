import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = useCallback(async (username, password) => {
    const result = await window.api.login(username, password);
    if (result.success) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
