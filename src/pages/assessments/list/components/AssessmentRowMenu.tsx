import * as React from "react";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

interface Props {
    onEdit: () => void;
    onDelete: () => void;
}

export function AssessmentRowMenu({ onEdit, onDelete }: Props) {
    const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
    const open = Boolean(anchor);
    const close = () => setAnchor(null);

    return (
        <>
            <IconButton
                size="small"
                aria-label="Mais ações"
                onClick={(e) => {
                    e.stopPropagation();
                    setAnchor(e.currentTarget);
                }}
                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
            >
                <MoreHorizRoundedIcon fontSize="small" />
            </IconButton>
            <Menu
                anchorEl={anchor}
                open={open}
                onClose={close}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { elevation: 4, sx: { mt: 0.5, minWidth: 180, borderRadius: 2 } } }}
                MenuListProps={{ disablePadding: true, dense: true, sx: { py: 0.5 } }}
                onClick={(e) => e.stopPropagation()}
            >
                <MenuItem
                    onClick={() => {
                        close();
                        onEdit();
                    }}
                    sx={{ py: 0.75, px: 1.5 }}
                >
                    <ListItemIcon>
                        <EditOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Editar" primaryTypographyProps={{ fontSize: 14 }} />
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        close();
                        onDelete();
                    }}
                    sx={{ py: 0.75, px: 1.5, color: "error.main" }}
                >
                    <ListItemIcon sx={{ color: "inherit" }}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Excluir" primaryTypographyProps={{ fontSize: 14 }} />
                </MenuItem>
            </Menu>
        </>
    );
}
