import * as React from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { EntityBreadcrumb, type Crumb } from "./EntityBreadcrumb";
import { EntityTabs, type TabItem } from "./EntityTabs";

interface Props {
    eyebrow?: string;
    crumbs: Crumb[];
    title: string;
    meta?: React.ReactNode;
    tabs: TabItem[];
    tabValue: string;
    tabActions?: React.ReactNode;
    switcher?: React.ReactNode;
    isLoading?: boolean;
}

const STICKY_TOP = 64;

export function EntityHeader({
    eyebrow,
    crumbs,
    title,
    meta,
    tabs,
    tabValue,
    tabActions,
    switcher,
    isLoading = false,
}: Props) {
    const sentinelRef = React.useRef<HTMLDivElement | null>(null);
    const [isStuck, setIsStuck] = React.useState(false);

    React.useEffect(() => {
        const node = sentinelRef.current;
        if (!node || typeof IntersectionObserver === "undefined") return;
        const obs = new IntersectionObserver(
            ([entry]) => setIsStuck(!entry.isIntersecting),
            { rootMargin: `-${STICKY_TOP + 1}px 0px 0px 0px`, threshold: 0 },
        );
        obs.observe(node);
        return () => obs.disconnect();
    }, []);

    return (
        <Box sx={{ display: "grid", gap: 0 }}>
            <Box sx={{ pt: 1, pb: 2 }}>
                {eyebrow && (
                    <Typography
                        sx={{
                            fontSize: 11,
                            letterSpacing: 1.5,
                            textTransform: "uppercase",
                            color: "text.secondary",
                            fontWeight: 700,
                            mb: 1,
                        }}
                    >
                        {eyebrow}
                    </Typography>
                )}

                {isLoading ? (
                    <Skeleton variant="text" width={220} height={18} sx={{ mb: 1 }} />
                ) : (
                    <Box sx={{ mb: 1 }}>
                        <EntityBreadcrumb crumbs={crumbs} />
                    </Box>
                )}

                <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mt: 0.5, minHeight: 40 }}>
                    {isLoading ? (
                        <Skeleton variant="text" width={320} height={40} />
                    ) : (
                        <Typography
                            component="h1"
                            sx={{
                                fontSize: { xs: 22, sm: 26, md: 28 },
                                fontWeight: 700,
                                letterSpacing: "-0.01em",
                                lineHeight: 1.2,
                                color: "text.primary",
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            title={title}
                        >
                            {title}
                        </Typography>
                    )}
                    {!isLoading && switcher}
                </Stack>

                {meta && !isLoading && (
                    <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {meta}
                    </Box>
                )}
            </Box>

            <Box ref={sentinelRef} aria-hidden sx={{ height: 1 }} />

            <Box
                sx={(theme) => ({
                    position: "sticky",
                    top: STICKY_TOP,
                    zIndex: theme.zIndex.appBar - 1,
                    bgcolor: theme.palette.background.default,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    transition: "box-shadow 200ms ease",
                    ...(isStuck && {
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }),
                })}
            >
                <Box
                    aria-hidden={!isStuck}
                    sx={{
                        overflow: "hidden",
                        maxHeight: isStuck ? 36 : 0,
                        opacity: isStuck ? 1 : 0,
                        transition: "max-height 220ms ease, opacity 180ms ease",
                        borderBottom: isStuck ? "1px solid" : "none",
                        borderColor: "divider",
                        px: 0.25,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "text.primary",
                            py: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {eyebrow ? (
                            <Box
                                component="span"
                                sx={{
                                    color: "text.secondary",
                                    fontWeight: 600,
                                    mr: 1,
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    fontSize: 11,
                                }}
                            >
                                {eyebrow}
                            </Box>
                        ) : null}
                        {title}
                    </Typography>
                </Box>

                <EntityTabs items={tabs} value={tabValue} actions={tabActions} />
            </Box>
        </Box>
    );
}
