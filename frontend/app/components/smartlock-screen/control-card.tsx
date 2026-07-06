import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material"
import { alpha } from "@mui/material/styles"
import LockRoundedIcon from "@mui/icons-material/LockRounded"
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded"
import NfcRoundedIcon from "@mui/icons-material/NfcRounded"
import AddModeratorRoundedIcon from "@mui/icons-material/AddModeratorRounded"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import { dateLabel } from "@/lib/format"
import { PowerIcon } from "./power-icon"

interface ControlCardProps {
  installed: boolean
  keyMode: boolean
  ownedProp?: {
    id: string
    name: string
    smartlock: {
      installed: boolean
      unlocked: boolean
      nfcEnabled: boolean
      lastOpenedAt?: string
    }
  }
  rental?: {
    id: string
    name: string
    hasKey?: boolean
  }
  active: boolean
  accentBg: string
  accentFg: string
  onInstallSmartlock: (id: string) => void
  onPower: () => void
  onOpenTenantLock: (id: string) => void
  onSetLockOpen: (id: string, open: boolean) => void
}

export function ControlCard({
  installed,
  keyMode,
  ownedProp,
  rental,
  active,
  accentBg,
  accentFg,
  onInstallSmartlock,
  onPower,
  onOpenTenantLock,
  onSetLockOpen,
}: ControlCardProps) {
  return (
    <Card
      sx={{
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: keyMode
          ? (theme) => alpha(theme.palette.tertiary.main, 0.03)
          : (theme) => alpha(theme.palette.primary.main, 0.03),
        "&:hover": {
          bgcolor: keyMode
            ? (theme) => alpha(theme.palette.tertiary.main, 0.07)
            : (theme) => alpha(theme.palette.primary.main, 0.07),
        },
        transition: "background-color 0.3s ease-in-out",
      }}
    >
      {!installed ? (
        <CardContent
          sx={{
            textAlign: "center",
            py: 5,
            px: 4,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 4,
              bgcolor: "surfaceContainer.high",
              display: "grid",
              placeItems: "center",
            }}
          >
            <AddModeratorRoundedIcon sx={{ fontSize: 40, color: "text.secondary" }} />
          </Box>
          <Typography variant="h6">Sin cerradura instalada</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, maxWidth: 260, textAlign: "center" }}>
            Colocá una cerradura virtual para &quot;{ownedProp?.name}&quot;. Quedará registrada en el contrato
            on-chain.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<LockRoundedIcon />}
            onClick={() => ownedProp && onInstallSmartlock(ownedProp.id)}
          >
            Colocar cerradura
          </Button>
        </CardContent>
      ) : (
        <CardContent sx={{ textAlign: "center", py: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {keyMode ? rental?.name : ownedProp?.name}
          </Typography>
          <Chip
            size="small"
            icon={<CheckCircleRoundedIcon />}
            label={keyMode ? "Llave vinculada al contrato" : "Cerradura registrada on-chain"}
            sx={{ mb: 2, bgcolor: accentBg, color: accentFg, "& .MuiChip-icon": { color: accentFg } }}
          />

          <PowerIcon
            active={active}
            keyMode={keyMode}
            unlocked={!keyMode && !!ownedProp?.smartlock.unlocked}
            onClick={onPower}
          />

          <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, mb: 0.25, alignItems: "center" }}>
            <NfcRoundedIcon sx={{ color: active ? (keyMode ? "tertiary.main" : "primary.main") : "text.disabled" }} />
            <Typography
              variant="h6"
              sx={{ color: active ? (keyMode ? "tertiary.main" : "primary.main") : "text.secondary", fontWeight: 700 }}
            >
              NFC {active ? "encendido" : "apagado"}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {active
              ? "Acercá el teléfono a la cerradura para operar."
              : "Tocá el ícono para encender el radio NFC."}
          </Typography>

          {keyMode ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={!rental?.hasKey}
              startIcon={<LockOpenRoundedIcon />}
              onClick={() => rental && onOpenTenantLock(rental.id)}
              sx={{ bgcolor: "tertiary.main", "&:hover": { bgcolor: "tertiary.main", filter: "brightness(0.92)" } }}
            >
              Acercar y abrir
            </Button>
          ) : (
            <Stack spacing={1} sx={{ alignItems: "center" }}>
              <Button
                variant={ownedProp?.smartlock.unlocked ? "outlined" : "contained"}
                size="large"
                disabled={!ownedProp?.smartlock.nfcEnabled}
                startIcon={ownedProp?.smartlock.unlocked ? <LockRoundedIcon /> : <LockOpenRoundedIcon />}
                onClick={() => ownedProp && onSetLockOpen(ownedProp.id, !ownedProp.smartlock.unlocked)}
              >
                {ownedProp?.smartlock.unlocked ? "Cerrar" : "Abrir"} cerradura
              </Button>
              <Typography variant="caption" color="text.secondary">
                Estado: {ownedProp?.smartlock.unlocked ? "Abierta" : "Cerrada"}
                {ownedProp?.smartlock.lastOpenedAt
                  ? ` · Última apertura ${dateLabel(ownedProp.smartlock.lastOpenedAt)}`
                  : ""}
              </Typography>
            </Stack>
          )}
        </CardContent>
      )}
    </Card>
  )
}
