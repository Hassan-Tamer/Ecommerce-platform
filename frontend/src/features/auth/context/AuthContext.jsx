import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as authApi from '../api/authApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isAuthenticated = Boolean(user ?? authApi.getToken())

  const register = useCallback(async (credentials) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.register(credentials)
      if (data.token) authApi.setToken(data.token)
      if (data.user) setUser(data.user)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (credentials) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.login(credentials)
      if (data.token) authApi.setToken(data.token)
      if (data.user) setUser(data.user)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authApi.clearToken()
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated,
      register,
      login,
      logout,
    }),
    [user, loading, error, isAuthenticated, register, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}