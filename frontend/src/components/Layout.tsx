import type { ReactNode } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    { text: 'Accueil', icon: <HomeIcon />, path: '/' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* AppBar avec Logo Alexann' */}
      <AppBar position="sticky" sx={{ backgroundColor: '#1482B7' }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo Alexann' */}
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              mr: 2,
              flexGrow: 1,
            }}
          >
            <Box
              component="img"
              src="/logo.jpeg"
              alt="Alexann'"
              className="logo-image"
              sx={{
                height: { xs: 40, md: 50 },
                objectFit: 'contain',
                display: 'block',
              }}
              onError={(e) => {
                // Si le logo ne charge pas, cacher l'image et afficher le texte
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // Afficher le texte de fallback
                const parent = target.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }
              }}
            />
            <Typography
              variant="h6"
              component="div"
              className="logo-fallback"
              sx={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                color: '#ffffff',
                display: 'none', // Caché par défaut, affiché seulement si le logo ne charge pas
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box component="span" sx={{ color: '#1482B7' }}>
                Alex
              </Box>
              <Box component="span" sx={{ color: '#8CB33A' }}>
                ann'
              </Box>
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {menuItems.map((item) => (
                <Typography
                  key={item.path}
                  variant="body1"
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: location.pathname === item.path ? 600 : 400,
                    color: '#ffffff',
                    borderBottom: location.pathname === item.path ? '2px solid #8CB33A' : '2px solid transparent',
                    pb: 0.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderBottom: '2px solid #8CB33A',
                    },
                  }}
                >
                  {item.text}
                </Typography>
              ))}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 250, pt: 2 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
          {children}
        </Container>
      </Box>

      {/* Footer avec charte graphique */}
      <Box
        component="footer"
        sx={{
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          mt: 'auto',
          bgcolor: '#f5f5f5',
          textAlign: 'center',
          borderTop: '1px solid #e0e0e0',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Montserrat, sans-serif',
            color: '#666666',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          }}
        >
          © 2025{' '}
          <Box component="span" sx={{ color: '#1482B7', fontWeight: 600 }}>
            Alex
          </Box>
          <Box component="span" sx={{ color: '#8CB33A', fontWeight: 600 }}>
            ann'
          </Box>
          {' '}- Hygiène et qualité agroalimentaire
        </Typography>
      </Box>
    </Box>
  );
}
