import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/authApi'

const AuthContext = createContext(null)

function storeSession(data, setUser) {
  if (data?.token) authApi.setToken(data.token)
  if (data?.user) setUser(data.user)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  const isAuthenticated = Boolean(user)

  useEffect(() => {
    authApi.setSessionHandler(setUser)
    let cancelled = false
    authApi
      .refresh()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const register = useCallback(async (credentials) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.register(credentials)
      storeSession(data, setUser)
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
      storeSession(data, setUser)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // The local session still ends if the server cannot revoke the refresh token.
    } finally {
      authApi.clearToken()
      setUser(null)
      setError(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      ready,
      error,
      isAuthenticated,
      register,
      login,
      logout,
    }),
    [user, loading, ready, error, isAuthenticated, register, login, logout],
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