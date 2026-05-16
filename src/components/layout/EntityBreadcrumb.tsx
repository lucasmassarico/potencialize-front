import { Box, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export interface Crumb {
    label: string;
    to?: string;
}

interface Props {
    crumbs: Crumb[];
}

export function EntityBreadcrumb({ crumbs }: Props) {
    return (
        <Box
            component="nav"
            aria-label="Trilha de navegação"
            sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 0.25,
                fontSize: 13,
                color: "text.secondary",
                minHeight: 20,
            }}
        >
            {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                const sep = i > 0 && (
                    <ChevronRightIcon
                        fontSize="inherit"
                        sx={{ mx: 0.25, opacity: 0.55, fontSize: 14 }}
                        aria-hidden
                    />
                );
                if (isLast || !c.to) {
                    return (
                        <Box key={`${c.label}-${i}`} sx={{ display: "inline-flex", alignItems: "center" }}>
                            {sep}
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: 13,
                                    color: isLast ? "text.primary" : "text.secondary",
                                    fontWeight: isLast ? 500 : 400,
                                    maxWidth: 320,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {c.label}
                            </Typography>
                        </Box>
                    );
                }
                return (
                    <Box key={`${c.label}-${i}`} sx={{ display: "inline-flex", alignItems: "center" }}>
                        {sep}
                        <Link
                            component={RouterLink}
                            to={c.to}
                            underline="hover"
                            sx={{
                                fontSize: 13,
                                color: "text.secondary",
                                fontWeight: 400,
                                "&:hover": { color: "text.primary" },
                            }}
                        >
                            {c.label}
                        </Link>
                    </Box>
                );
            })}
        </Box>
    );
}
