import { createTheme, alpha } from "@mui/material/styles"

// Material You (Material Design 3) tonal palette — green seed.
// Custom M3 color roles are added to the MUI palette via module augmentation.

declare module "@mui/material/styles" {
  interface Palette {
    primaryContainer: Palette["primary"]
    secondaryContainer: Palette["primary"]
    tertiary: Palette["primary"]
    tertiaryContainer: Palette["primary"]
    errorContainer: Palette["primary"]
    surfaceVariant: Palette["primary"]
    surfaceContainer: { low: string; main: string; high: string; highest: string }
    outline: string
    outlineVariant: string
  }
  interface PaletteOptions {
    primaryContainer?: PaletteOptions["primary"]
    secondaryContainer?: PaletteOptions["primary"]
    tertiary?: PaletteOptions["primary"]
    tertiaryContainer?: PaletteOptions["primary"]
    errorContainer?: PaletteOptions["primary"]
    surfaceVariant?: PaletteOptions["primary"]
    surfaceContainer?: { low: string; main: string; high: string; highest: string }
    outline?: string
    outlineVariant?: string
  }
}

const light = {
  primary: "#006d3b",
  onPrimary: "#ffffff",
  primaryContainer: "#97f7b4",
  onPrimaryContainer: "#00210f",
  secondary: "#4f6353",
  onSecondary: "#ffffff",
  secondaryContainer: "#d2e8d4",
  onSecondaryContainer: "#0d1f13",
  tertiary: "#3b6470",
  onTertiary: "#ffffff",
  tertiaryContainer: "#bfe9f8",
  onTertiaryContainer: "#001f27",
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#410002",
  background: "#f6fbf3",
  onBackground: "#191c19",
  surface: "#f6fbf3",
  onSurface: "#191c19",
  surfaceVariant: "#dce5db",
  onSurfaceVariant: "#414941",
  outline: "#717971",
  outlineVariant: "#c0c9be",
  surfaceContainerLow: "#f0f5ed",
  surfaceContainer: "#eaefe7",
  surfaceContainerHigh: "#e5eae2",
  surfaceContainerHighest: "#dfe4dc",
}

const dark = {
  primary: "#7bdb9c",
  onPrimary: "#00391d",
  primaryContainer: "#00522c",
  onPrimaryContainer: "#97f7b4",
  secondary: "#b6ccb8",
  onSecondary: "#223526",
  secondaryContainer: "#384b3c",
  onSecondaryContainer: "#d2e8d4",
  tertiary: "#a3cddb",
  onTertiary: "#023641",
  tertiaryContainer: "#224d58",
  onTertiaryContainer: "#bfe9f8",
  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffdad6",
  background: "#191c19",
  onBackground: "#e1e3dd",
  surface: "#111411",
  onSurface: "#e1e3dd",
  surfaceVariant: "#414941",
  onSurfaceVariant: "#c0c9be",
  outline: "#8b938a",
  outlineVariant: "#414941",
  surfaceContainerLow: "#191c19",
  surfaceContainer: "#1d211d",
  surfaceContainerHigh: "#272b27",
  surfaceContainerHighest: "#323632",
}

function buildTheme(mode: "light" | "dark") {
  const c = mode === "light" ? light : dark
  return createTheme({
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.onPrimary },
      secondary: { main: c.secondary, contrastText: c.onSecondary },
      error: { main: c.error, contrastText: c.onError },
      background: { default: c.background, paper: c.surfaceContainerLow },
      text: { primary: c.onSurface, secondary: c.onSurfaceVariant },
      divider: c.outlineVariant,
      primaryContainer: { main: c.primaryContainer, contrastText: c.onPrimaryContainer },
      secondaryContainer: { main: c.secondaryContainer, contrastText: c.onSecondaryContainer },
      tertiary: { main: c.tertiary, contrastText: c.onTertiary },
      tertiaryContainer: { main: c.tertiaryContainer, contrastText: c.onTertiaryContainer },
      errorContainer: { main: c.errorContainer, contrastText: c.onErrorContainer },
      surfaceVariant: { main: c.surfaceVariant, contrastText: c.onSurfaceVariant },
      surfaceContainer: {
        low: c.surfaceContainerLow,
        main: c.surfaceContainer,
        high: c.surfaceContainerHigh,
        highest: c.surfaceContainerHighest,
      },
      outline: c.outline,
      outlineVariant: c.outlineVariant,
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      h4: { fontWeight: 500, letterSpacing: "-0.5px" },
      h5: { fontWeight: 500 },
      h6: { fontWeight: 500 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: "0.1px" },
      subtitle2: { fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: "16px",
            border: "none",
            backgroundColor: alpha(c.primary, 0.03), // MD3 tonal surface tint
            transition: "background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: alpha(c.primary, 0.07), // Intensified overlay on hover
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.04)", // Subtle elevation indicator
            },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 999, paddingInline: 22, paddingBlock: 9, minHeight: 42 },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            backgroundColor: c.primaryContainer,
            color: c.onPrimaryContainer,
            "&:hover": { backgroundColor: alpha(c.primaryContainer, 0.9) },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            textTransform: "none",
            borderColor: c.outline,
            "&.Mui-selected": {
              backgroundColor: c.secondaryContainer,
              color: c.onSecondaryContainer,
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 999, height: 8, backgroundColor: c.surfaceContainerHighest },
          bar: { borderRadius: 999 },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 28, backgroundColor: c.surfaceContainerHigh } },
      },
      MuiListItemButton: {
        styleOverrides: { root: { borderRadius: 999 } },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8 } },
      },
    },
  })
}

export const lightTheme = buildTheme("light")
export const darkTheme = buildTheme("dark")
