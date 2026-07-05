import { useEffect, useState, type ReactNode } from "react"
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Chip,
  IconButton,
  Tooltip,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded"
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded"
import LockRoundedIcon from "@mui/icons-material/LockRounded"
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded"
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded"
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded"
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded"
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded"
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded"

const NAV = [
  { label: "Buscador", href: "/", icon: <TravelExploreRoundedIcon /> },
  { label: "Propiedades", href: "/propiedades", icon: <HomeWorkRoundedIcon /> },
  { label: "Alquileres", href: "/alquileres", icon: <VpnKeyRoundedIcon /> },
  { label: "Smartlock", href: "/smartlock", icon: <LockRoundedIcon /> },
]

interface AppShellProps {
  children: ReactNode
  walletLabel: string
  walletConnected: boolean
  balance: number
  currentPathname: string
  onNavigate: (href: string) => void
  mode: "light" | "dark"
  onToggleTheme: () => void
  onConnectWallet?: () => void
  onDisconnectWallet?: () => void
  connectWalletSlot?: ReactNode
}

export function AppShell({
  children,
  walletLabel,
  walletConnected,
  balance,
  currentPathname,
  onNavigate,
  mode,
  onToggleTheme,
  onConnectWallet,
  onDisconnectWallet,
  connectWalletSlot,
}: AppShellProps) {
  const theme = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const matchesDesktop = useMediaQuery(theme.breakpoints.up("md"))
  const isDesktop = mounted && matchesDesktop

  const activeIndex = NAV.findIndex((n) => n.href === currentPathname)

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
      {/* Navigation rail (desktop) */}
      {isDesktop && (
        <Box
          component="nav"
          sx={{
            width: 96,
            flexShrink: 0,
            position: "sticky",
            top: 0,
            height: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            pt: 3,
            pb: 2,
            bgcolor: "background.default",
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "grid",
              placeItems: "center",
              mb: 2,
              fontWeight: 800,
            }}
          >
            BR
          </Box>
          {NAV.map((item, i) => {
            const active = activeIndex === i
            return (
              <Box
                key={item.href}
                onClick={() => onNavigate(item.href)}
                role="button"
                aria-label={item.label}
                sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, cursor: "pointer", width: "100%" }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 32,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    color: active ? "secondaryContainer.contrastText" : "text.secondary",
                    bgcolor: active ? "secondaryContainer.main" : "transparent",
                    transition: "all .2s",
                    "&:hover": { bgcolor: active ? "secondaryContainer.main" : "action.hover" },
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: active ? 700 : 500, color: active ? "text.primary" : "text.secondary" }}
                >
                  {item.label}
                </Typography>
              </Box>
            )
          })}
        </Box>
      )}

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{ bgcolor: "background.default" }}
        >
          <Toolbar sx={{ gap: 1.5 }}>
            {!isDesktop && (
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                BR
              </Box>
            )}
            <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
              BlockRent
            </Typography>

            <Chip
              icon={<AccountBalanceWalletRoundedIcon />}
              label={`${balance.toLocaleString()} USDC`}
              sx={{ bgcolor: "primaryContainer.main", color: "primaryContainer.contrastText", fontWeight: 700 }}
            />
            {wallet ? (
              <Box
                sx={{
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  pl: 1.5,
                  pr: 0.5,
                  height: 32,
                  gap: 0.5,
                }}
              >
                <Typography variant="body2" sx={{ fontFamily: "monospace", mr: 0.5 }}>
                  {`${wallet.slice(0, 6)}...${wallet.slice(-4)}`}
                </Typography>
                <Tooltip title="Copiar dirección">
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(wallet)}>
                    <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Desconectar">
                  <IconButton size="small" color="error" onClick={onDisconnectWallet}>
                    <LogoutRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              connectWalletSlot || (
                <Button
                  variant="contained"
                  color="primary"
                  disableElevation
                  onClick={onConnectWallet}
                  sx={{
                    height: 32,
                    textTransform: "none",
                    borderRadius: 2,
                    px: 2,
                    fontWeight: 600,
                    fontSize: "0.875rem"
                  }}
                >
                  Conectar
                </Button>
              )
            )}
            <Tooltip title={mode === "light" ? "Modo oscuro" : "Modo claro"}>
              <IconButton onClick={onToggleTheme} aria-label="cambiar tema">
                {mode === "light" ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            width: "100%",
            height: "calc(100vh - 64px)",
            overflow: "hidden",
            borderTopLeftRadius: { md: 24 },
            bgcolor: "background.default",
          }}
        >
          {currentPathname === "/" ? (
            children
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                px: { xs: 2, md: 4 },
                py: { xs: 2.5, md: 4 },
                pb: { xs: 12, md: 4 },
                maxWidth: 1280,
                width: "100%",
                mx: "auto",
                overflowY: "auto",
              }}
            >
              {children}
            </Box>
          )}
        </Box>
      </Box>

      {/* Bottom navigation (mobile) */}
      {!isDesktop && (
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "surfaceContainer.main",
          }}
        >
          <BottomNavigation
            showLabels
            value={activeIndex === -1 ? 0 : activeIndex}
            onChange={(_, idx) => onNavigate(NAV[idx].href)}
            sx={{ bgcolor: "transparent", height: 72 }}
          >
            {NAV.map((item) => (
              <BottomNavigationAction key={item.href} label={item.label} icon={item.icon} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}
