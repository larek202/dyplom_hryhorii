import { createElement, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import EventIcon from '@mui/icons-material/Event';
import MapIcon from '@mui/icons-material/Map';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LoginIcon from '@mui/icons-material/Login';
import DrawerAuthSection from './DrawerAuthSection.jsx';
import SidebarSectionLabel from './SidebarSectionLabel.jsx';
import { getSidebarNavItemSx, SIDEBAR_LIST_ITEM_ICON_SX } from './sidebarNavItemSx.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ORGANIZER_ONLY_ROLES } from '../../auth/routeAccess.js';
import { getUserInitials } from '../../utils/userInitials.js';

const DRAWER_WIDTH = 288;

const mainNav = [
  { to: '/events', label: 'Wydarzenia', icon: EventIcon },
  { to: '/mapa', label: 'Mapa', icon: MapIcon },
  { to: '/favorites', label: 'Ulubione', icon: FavoriteBorderIcon },
  { to: '/bookings', label: 'Rezerwacje', icon: ConfirmationNumberOutlinedIcon },
  { to: '/organizer', label: 'Panel organizatora', icon: DashboardOutlinedIcon },
];

function drawerShowsOrganizerPanel(user) {
  const role = user?.role != null && user?.role !== '' ? String(user.role) : 'user';
  return ORGANIZER_ONLY_ROLES.includes(role);
}

function DrawerContent({ onNavigate }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const mainNavItems = mainNav.filter((item) => {
    if (item.to === '/organizer') return drawerShowsOrganizerPanel(user);
    return true;
  });

  const isActive = (to) => {
    if (to === '/events') return pathname === '/events' || pathname.startsWith('/events/');
    if (to === '/organizer') return pathname.startsWith('/organizer');
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#f8fafc',
      }}
    >
      <Box
        component={NavLink}
        to="/events"
        onClick={onNavigate}
        sx={(theme) => ({
          px: 2,
          py: 2.5,
          textDecoration: 'none',
          color: 'text.primary',
          borderBottom: `1px solid ${alpha('#0f172a', 0.08)}`,
          background: `linear-gradient(180deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 1)} 100%)`,
          boxShadow: `0 1px 0 ${alpha('#ffffff', 0.9)} inset`,
          transition: theme.transitions.create(['background-color', 'box-shadow'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover': {
            bgcolor: alpha('#ffffff', 0.95),
            boxShadow: `0 1px 0 ${alpha('#ffffff', 0.9)} inset, 0 8px 24px ${alpha(theme.palette.primary.main, 0.06)}`,
          },
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              flexShrink: 0,
              background: (t) =>
                `linear-gradient(145deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: '-0.04em',
              boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.35)}`,
            }}
          >
            M
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.2,
                fontSize: '1.0625rem',
              }}
            >
              MoveMint
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.35, letterSpacing: '-0.01em', lineHeight: 1.35 }}
            >
              Wydarzenia w jednym miejscu
            </Typography>
          </Box>
        </Box>
      </Box>

      <SidebarSectionLabel sx={{ pt: 3.75, pb: 1.1 }}>Menu</SidebarSectionLabel>

      <List sx={{ px: 1, py: 0.5, flex: 1, pb: 4 }} aria-label="Menu główne" disablePadding>
        {mainNavItems.map(({ to, label, icon }) => {
          const active = isActive(to);
          return (
            <ListItemButton
              key={to}
              component={NavLink}
              to={to}
              selected={active}
              onClick={onNavigate}
              sx={getSidebarNavItemSx({ active })}
            >
              <ListItemIcon sx={SIDEBAR_LIST_ITEM_ICON_SX}>
                {createElement(icon, { fontSize: 'small' })}
              </ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{
                  primary: {
                    fontWeight: 'inherit',
                    fontSize: '0.9375rem',
                    letterSpacing: '-0.02em',
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <DrawerAuthSection onNavigate={onNavigate} />
    </Box>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();

  const handleDrawerToggle = () => setMobileOpen((o) => !o);
  const closeMobile = () => setMobileOpen(false);

  const drawerPaper = {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    borderRight: `1px solid ${alpha('#0f172a', 0.09)}`,
    boxShadow: '8px 0 32px rgba(15, 23, 42, 0.07), 1px 0 0 rgba(255, 255, 255, 0.6) inset',
    bgcolor: '#f8fafc',
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: alpha('#ffffff', 0.85),
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderBottom: 1,
          borderColor: alpha('#0f172a', 0.06),
          color: 'text.primary',
          boxShadow: `0 1px 0 ${alpha('#0f172a', 0.04)}`,
        }}
      >
        <Toolbar
          sx={{
            gap: 2,
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 1.5, sm: 2.5 },
            pt: 'env(safe-area-inset-top, 0px)',
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { md: 'none' } }}
            aria-label="Otwórz menu"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          {loading ? (
            <IconButton disabled aria-label="Ładowanie konta" sx={{ p: 0.5 }}>
              <CircularProgress size={22} color="inherit" />
            </IconButton>
          ) : user ? (
            <IconButton
              component={NavLink}
              to="/profile"
              aria-label="Twój profil"
              sx={{
                p: 0.5,
                border: `1px solid ${alpha('#0f172a', 0.08)}`,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: alpha('#f1f5f9', 1) },
              }}
            >
              <Avatar
                src={user.avatar || undefined}
                alt=""
                sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontWeight: 700, fontSize: '0.8125rem' }}
              >
                {getUserInitials(user)}
              </Avatar>
            </IconButton>
          ) : (
            <IconButton component={NavLink} to="/login" aria-label="Logowanie" color="inherit" sx={{ p: 0.5 }}>
              <LoginIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: DRAWER_WIDTH },
          flexShrink: { md: 0 },
          height: { md: '100vh' },
          overflow: { md: 'hidden' },
        }}
        aria-label="Nawigacja boczna"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': drawerPaper,
          }}
        >
          <DrawerContent onNavigate={closeMobile} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            height: { md: '100%' },
            '& .MuiDrawer-paper': {
              ...drawerPaper,
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              overflowY: 'auto',
            },
          }}
        >
          <DrawerContent onNavigate={() => {}} />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={(theme) => ({
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          pt: {
            xs: 'calc(56px + env(safe-area-inset-top, 0px))',
            sm: 'calc(64px + env(safe-area-inset-top, 0px))',
          },
          borderLeft: { md: `1px solid ${alpha('#0f172a', 0.05)}` },
          boxShadow: { md: `-12px 0 40px -12px ${alpha('#0f172a', 0.06)}` },
          bgcolor: theme.palette.background.default,
        })}
      >
        <Box
          sx={{
            maxWidth: 1440,
            mx: 'auto',
            px: { xs: 1.5, sm: 2.25, md: 4 },
            py: { xs: 2, sm: 3, md: 4 },
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
