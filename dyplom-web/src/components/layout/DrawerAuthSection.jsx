import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import SidebarSectionLabel from './SidebarSectionLabel.jsx';
import {
  getSidebarLogoutItemSx,
  getSidebarNavItemSx,
  SIDEBAR_LIST_ITEM_ICON_SX,
} from './sidebarNavItemSx.js';

const ACCOUNT_NAV_PRIMARY_SLOT = {
  primary: { fontSize: '0.9375rem', fontWeight: 'inherit', letterSpacing: '-0.02em' },
};

/**
 * Dolna część menu: logowanie/rejestracja albo profil/wyloguj (PL, MUI).
 * @param {{ onNavigate?: () => void }} props
 */
export default function DrawerAuthSection({ onNavigate }) {
  const { pathname } = useLocation();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { ask, dialog } = useConfirm('Czy na pewno chcesz się wylogować?');

  async function handleLogout() {
    const ok = await ask();
    if (!ok) return;
    logout();
    onNavigate?.();
    navigate('/login', { replace: true });
  }

  const profileActive = pathname === '/profile' || pathname.startsWith('/profile/');

  return (
    <>
      {dialog}
      <Divider sx={{ borderColor: alpha('#0f172a', 0.08), mx: 1.5, mt: 0.5 }} />
      <SidebarSectionLabel sx={{ pt: 3.25, pb: 1.1 }}>Konto</SidebarSectionLabel>
      <Box component="nav" aria-label="Konto" sx={{ px: 1, pb: 2.5, pt: 0.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }} role="status">
            <CircularProgress size={24} aria-label="Ładowanie konta" />
          </Box>
        ) : user ? (
          <List disablePadding>
            <ListItemButton
              component={NavLink}
              to="/profile"
              selected={profileActive}
              onClick={onNavigate}
              sx={getSidebarNavItemSx({ active: profileActive })}
            >
              <ListItemIcon sx={SIDEBAR_LIST_ITEM_ICON_SX}>
                <PersonOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Profil" slotProps={ACCOUNT_NAV_PRIMARY_SLOT} />
            </ListItemButton>
            <ListItemButton onClick={handleLogout} sx={getSidebarLogoutItemSx()} aria-label="Wyloguj">
              <ListItemIcon sx={SIDEBAR_LIST_ITEM_ICON_SX}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Wyloguj" slotProps={ACCOUNT_NAV_PRIMARY_SLOT} />
            </ListItemButton>
          </List>
        ) : (
          <List disablePadding>
            <ListItemButton
              component={NavLink}
              to="/login"
              selected={pathname === '/login'}
              onClick={onNavigate}
              sx={getSidebarNavItemSx({ active: pathname === '/login' })}
            >
              <ListItemIcon sx={SIDEBAR_LIST_ITEM_ICON_SX}>
                <LoginIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Logowanie" slotProps={ACCOUNT_NAV_PRIMARY_SLOT} />
            </ListItemButton>
            <ListItemButton
              component={NavLink}
              to="/register"
              selected={pathname === '/register'}
              onClick={onNavigate}
              sx={getSidebarNavItemSx({ active: pathname === '/register' })}
            >
              <ListItemIcon sx={SIDEBAR_LIST_ITEM_ICON_SX}>
                <PersonAddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Rejestracja" slotProps={ACCOUNT_NAV_PRIMARY_SLOT} />
            </ListItemButton>
          </List>
        )}
      </Box>
    </>
  );
}
