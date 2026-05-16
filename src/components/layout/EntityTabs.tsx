import { Tabs, Tab, Badge, Box } from "@mui/material";
import { Link } from "react-router-dom";

export interface TabItem {
    key: string;
    label: string;
    to: string;
    badge?: number | string;
}

interface Props {
    items: TabItem[];
    value: string;
    actions?: React.ReactNode;
}

export function EntityTabs({ items, value, actions }: Props) {
    const safeValue = items.some((i) => i.key === value) ? value : items[0]?.key ?? false;

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                minHeight: 48,
            }}
        >
            <Tabs
                value={safeValue}
                variant="scrollable"
                allowScrollButtonsMobile
                sx={{
                    minHeight: 48,
                    "& .MuiTabs-indicator": {
                        height: 2,
                        borderRadius: "2px 2px 0 0",
                    },
                    "& .MuiTab-root": {
                        minHeight: 48,
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: 14,
                        letterSpacing: 0,
                        color: "text.secondary",
                        px: 1.75,
                        "&:hover": { color: "text.primary" },
                        "&.Mui-selected": { color: "primary.main" },
                    },
                }}
            >
                {items.map((it) => (
                    <Tab
                        key={it.key}
                        value={it.key}
                        component={Link}
                        to={it.to}
                        label={
                            it.badge !== undefined && it.badge !== null && it.badge !== 0 ? (
                                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                                    {it.label}
                                    <Badge
                                        badgeContent={it.badge}
                                        color="primary"
                                        sx={{
                                            "& .MuiBadge-badge": {
                                                position: "static",
                                                transform: "none",
                                                fontSize: 11,
                                                height: 18,
                                                minWidth: 18,
                                                padding: "0 6px",
                                            },
                                        }}
                                    />
                                </Box>
                            ) : (
                                it.label
                            )
                        }
                    />
                ))}
            </Tabs>

            {actions && <Box sx={{ display: "flex", alignItems: "center", gap: 1, pr: 0.5 }}>{actions}</Box>}
        </Box>
    );
}
