import { alpha } from '@mui/material/styles';

/** Odstęp ikona–tekst (ListItemIcon minWidth). */
export const SIDEBAR_LIST_ITEM_ICON_SX = { minWidth: 48, color: 'inherit' };

/**
 * Wspólny styl pozycji w sidebarze (MUI ListItemButton).
 * Jednolita wysokość wiersza — aktywny nie „puchnie” względem reszty (pill + czytelny stan).
 * @param {{ active?: boolean }} opts
 */
export function getSidebarNavItemSx({ active = false } = {}) {
  return (theme) => ({
    mx: 1.5,
    mb: 1,
    px: 1.75,
    py: 0.75,
    minHeight: 40,
    maxHeight: 40,
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], {
      duration: theme.transitions.duration.shorter,
    }),
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
    fontWeight: active ? 600 : 500,
    boxShadow: active ? `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
    '&::before': active
      ? {
          content: '""',
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 3,
          height: 18,
          borderRadius: '0 4px 4px 0',
          bgcolor: 'primary.main',
        }
      : {},
    '&:hover': {
      bgcolor: active
        ? alpha(theme.palette.primary.main, 0.14)
        : alpha(theme.palette.common.black, 0.055),
      color: active ? theme.palette.primary.dark : theme.palette.text.primary,
      boxShadow: active ? `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.26)}` : 'none',
    },
    '&.Mui-focusVisible': {
      outline: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
      outlineOffset: 2,
    },
    '&.Mui-selected': {
      bgcolor: alpha(theme.palette.primary.main, 0.1),
      '&:hover': {
        bgcolor: alpha(theme.palette.primary.main, 0.14),
      },
    },
  });
}

/**
 * Wyloguj — neutralnie domyślnie, czerwień dopiero na hover (bez dominowania nad menu).
 */
export function getSidebarLogoutItemSx() {
  return (theme) => ({
    mx: 1.5,
    mt: 2.75,
    mb: 0,
    px: 1.75,
    py: 0.75,
    minHeight: 40,
    maxHeight: 40,
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    transition: theme.transitions.create(['background-color', 'color', 'border-color', 'box-shadow'], {
      duration: theme.transitions.duration.shorter,
    }),
    color: theme.palette.text.secondary,
    fontWeight: 500,
    bgcolor: 'transparent',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
    '&:hover': {
      bgcolor: alpha(theme.palette.error.main, 0.06),
      color: theme.palette.error.main,
      borderColor: alpha(theme.palette.error.main, 0.35),
      boxShadow: `0 1px 4px ${alpha(theme.palette.error.main, 0.12)}`,
    },
    '&.Mui-focusVisible': {
      outline: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
      outlineOffset: 2,
    },
  });
}
