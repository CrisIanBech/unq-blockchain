import { useState, useMemo } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { lightTheme, darkTheme } from "@/lib/theme"
import { useUserStore } from "@stores/user-store"
import { AppShell } from "@components/app-shell/app-shell"
import { ToastHost } from "@components/toast-host/toast-host"

export function AppLayout() {
  const [mode, setMode] = useState<"light" | "dark">("light")
  const location = useLocation()
  const navigate = useNavigate()

  const { wallet, balance, toasts, dismissToast, connectWallet } = useUserStore()

  const theme = useMemo(() => (mode === "light" ? lightTheme : darkTheme), [mode])

  function handleToggleTheme() {
    setMode((m) => (m === "light" ? "dark" : "light"))
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell
        wallet={wallet}
        balance={balance}
        onConnectWallet={connectWallet}
        currentPathname={location.pathname}
        onNavigate={navigate}
        mode={mode}
        onToggleTheme={handleToggleTheme}
      >
        <Outlet />
      </AppShell>
      <ToastHost toasts={toasts} onDismissToast={dismissToast} />
    </ThemeProvider>
  )
}
