import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { dangNhap, dangXuat, layThongTinToi } from '../services/authService'

const PlayerCtx = createContext(null)

export function PlayerProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const u = await layThongTinToi()
      setUser(u)
      return u
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (ma, pin) => {
    const u = await dangNhap(ma, pin)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await dangXuat()
    setUser(null)
  }, [])

  return (
    <PlayerCtx.Provider value={{ user, loading, refresh, login, logout, setUser }}>
      {children}
    </PlayerCtx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePlayer = () => useContext(PlayerCtx)
