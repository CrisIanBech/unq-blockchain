import { Button, Box, Typography } from "@mui/material"
import { useAccount, useConnect, useDisconnect } from "wagmi"

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </Typography>
        <Button size="small" variant="outlined" onClick={() => disconnect()}>
          Desconectar
        </Button>
      </Box>
    )
  }

  return (
    <Button
      variant="contained"
      size="small"
      onClick={() => {
        const injected = connectors.find((c) => c.id === "injected")
        if (injected) connect({ connector: injected })
      }}
    >
      Conectar Wallet
    </Button>
  )
}
