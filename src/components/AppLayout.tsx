// src/components/AppLayout.tsx
import React from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Button,
    useTheme,
    useMediaQuery,
} from "@mui/material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SchoolIcon from "@mui/icons-material/School";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../hooks/useAuth";

const drawerWidth = 240;
const collapsedWidth = 72;

export default function AppLayout() {
    const { logout, user } = useAuth();
    const [open, setOpen] = React.useState(true);
    const nav = useNavigate();
    const { pathname } = useLocation();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const items = [
        { label: "Dashboard", icon: <DashboardIcon />, to: "/" },
        { label: "Turmas", icon: <SchoolIcon />, to: "/classes" },
    ];

    // Drawer fica colapsado automaticamente no mobile
    const drawerOpen = open;
    const drawerWidthFinal = !isMobile && !open ? collapsedWidth : drawerWidth;

    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            {/* Top Bar */}
            <AppBar
                position="fixed"
                sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
            >
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => setOpen((v) => !v)}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Potencialize
                    </Typography>
                    <Typography variant="body2" sx={{ mr: 2, opacity: 0.85 }}>
                        {user?.role === "admin" ? "Admin" : "Professor"}
                    </Typography>
                    <Button
                        color="inherit"
                        startIcon={<LogoutIcon />}
                        onClick={() => logout().then(() => nav("/login"))}
                    >
                        Sair
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Drawer lateral */}
            <Drawer
                variant={isMobile ? "temporary" : "permanent"}
                open={drawerOpen}
                onClose={() => setOpen(false)}
                sx={{
                    width: drawerWidthFinal,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: drawerWidthFinal,
                        boxSizing: "border-box",
                        transition: "width 0.3s",
                        overflowX: "hidden",
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: "auto" }}>
                    <List>
                        {items.map((it) => (
                            <ListItem key={it.to} disablePadding>
                                <ListItemButton
                                    selected={pathname === it.to}
                                    onClick={() => {
                                        nav(it.to);
                                        if (isMobile) setOpen(false);
                                    }}
                                    sx={{
                                        justifyContent: drawerOpen
                                            ? "initial"
                                            : "center",
                                        px: 2.5,
                                        overflowX: "hidden",
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: drawerOpen ? 2 : "auto",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {it.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={it.label}
                                        sx={{
                                            opacity: drawerOpen ? 1 : 0,
                                            display: drawerOpen
                                                ? "block"
                                                : "none",
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Divider />
                </Box>
            </Drawer>

            {/* Conteúdo principal */}
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}
