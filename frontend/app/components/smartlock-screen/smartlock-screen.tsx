import { Box, Card, Typography } from "@mui/material"
import { alpha } from "@mui/material/styles"
import type { UseSmartlockPageReturn } from "@hooks/use-smartlock-page"
import { ModeSwitch } from "./mode-switch"
import { SideSelector } from "./side-selector"
import { ControlCard } from "./control-card"

export function SmartlockScreen({
  keyMode,
  ownedProp,
  rental,
  list,
  selId,
  active,
  installed,
  onSetKeyMode,
  onSelectId,
  onPower,
  onInstallSmartlock,
  onSetLockOpen,
  onOpenTenantLock,
}: UseSmartlockPageReturn) {
  // Compute accent props for legacy subcomponents that still need them
  const accentBg = keyMode ? "tertiaryContainer.main" : "primaryContainer.main"
  const accentFg = keyMode ? "tertiaryContainer.contrastText" : "primaryContainer.contrastText"

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Page header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Smartlock
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Cerraduras virtuales con apertura por NFC, vinculadas al contrato on-chain.
        </Typography>
      </Box>

      {/* Segmented mode selector */}
      <ModeSwitch keyMode={keyMode} onSetKeyMode={onSetKeyMode} />

      {/* Main layout: sidebar + control hero */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "280px 1fr" },
          gap: 3,
          alignItems: "stretch", // force equal column heights
          flex: 1, // fill remaining height
          minHeight: 0, // allow shrinking in flex context
        }}
      >
        {/* SideSelector wrapped in a Card so it matches ControlCard height */}
        <Card
          sx={{
            p: 2,
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
          <SideSelector
            keyMode={keyMode}
            list={list}
            selId={selId}
            onSelectId={onSelectId}
          />
        </Card>

        <ControlCard
          installed={installed}
          keyMode={keyMode}
          ownedProp={ownedProp}
          rental={rental}
          active={active}
          accentBg={accentBg}
          accentFg={accentFg}
          onInstallSmartlock={onInstallSmartlock}
          onPower={onPower}
          onOpenTenantLock={onOpenTenantLock}
          onSetLockOpen={onSetLockOpen}
        />
      </Box>
    </Box>
  )
}
