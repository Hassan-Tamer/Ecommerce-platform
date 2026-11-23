import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearAvatarPreview } from '../../account/avatarPreview'
import * as authApi from '../api/authApi'

const AuthContext = createContext(null)

function storeSession(data, acceptUser) {
  if (data?.token) authApi.setToken(data.token)
  if (data?.user) acceptUser(data.user)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  const isAuthenticated = Boolean(user)

  const acceptUser = useCallback((next) => {
    if (!next) {
      setUser(null)
      return
    }
    setUser({ ...next, role: authApi.readRole() })
  }, [])

  useEffect(() => {
    authApi.setSessionHandler(acceptUser)
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
  }, [acceptUser])

  const register = useCallback(async (credentials) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.register(credentials)
      clearAvatarPreview()
      storeSession(data, acceptUser)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [acceptUser])

  const login = useCallback(async (credentials) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.login(credentials)
      clearAvatarPreview()
      storeSession(data, acceptUser)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [acceptUser])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // The local session still ends if the server cannot revoke the refresh token.
    } finally {
      authApi.clearToken()
      clearAvatarPreview()
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