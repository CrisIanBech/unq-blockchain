import { useState, useMemo } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { lightTheme, darkTheme } from "@/lib/theme"
import { useUserStore } from "@stores/user-store"
import { AppShell } from "@components/app-shell/app-shell"
import { ToastHost } from "@components/toast-host/toast-host"
import { ConnectWallet } from "@components/connect-wallet/connect-wallet"

export function AppLayout() {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("blockrent-theme-mode")
      if (saved === "light" || saved === "dark") {
        return saved
      }
    }
    return "light"
  })
  const location = useLocation()
  const navigate = useNavigate()

  const { wallet, balance, toasts, dismissToast, connectWallet, disconnectWallet } = useUserStore()

  const theme = useMemo(() => (mode === "light" ? lightTheme : darkTheme), [mode])

  function handleToggleTheme() {
    setMode((m) => {
      const next = m === "light" ? "dark" : "light"
      localStorage.setItem("blockrent-theme-mode", next)
      return next
    })
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell
        wallet={wallet}
        balance={balance}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        currentPathname={location.pathname}
        onNavigate={navigate}
        mode={mode}
        onToggleTheme={handleToggleTheme}
        connectWalletSlot={<ConnectWallet />}
      >
        <Outlet />
      </AppShell>
      <ToastHost toasts={toasts} onDismissToast={dismissToast} />
    </ThemeProvider>
  )
}
