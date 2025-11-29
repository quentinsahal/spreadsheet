import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Menu,
  MenuItem,
  Button,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  FolderOpen as OpenIcon,
  FileDownload as DownloadIcon,
  ContentCopy as CopyIcon,
  DriveFileRenameOutline as RenameIcon,
} from "@mui/icons-material";

export function FileMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNewSpreadsheet = () => {
    handleClose();
    // Navigate to /spreadsheet without ID to create a new one
    navigate("/spreadsheet");
  };

  const handleOpen = () => {
    handleClose();
    // TODO: Implement open dialog
  };

  const handleDownload = () => {
    handleClose();
    // TODO: Implement CSV download
  };

  const handleDuplicate = () => {
    handleClose();
    // TODO: Implement duplicate
  };

  const handleRename = () => {
    handleClose();
    // TODO: Implement rename
  };

  return (
    <>
      <Button
        id="file-menu-button"
        aria-controls={open ? "file-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        sx={{
          color: "#444",
          textTransform: "none",
          fontSize: "14px",
          fontWeight: 500,
          minWidth: "auto",
          padding: "2px 8px",
          lineHeight: 1.4,
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
            borderRadius: "4px",
          },
        }}
      >
        {t("menu.file")}
      </Button>
      <Menu
        id="file-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            "aria-labelledby": "file-menu-button",
          },
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        sx={{
          "& .MuiPaper-root": {
            minWidth: 220,
            boxShadow:
              "0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)",
          },
          "& .MuiMenuItem-root": {
            py: 0.5,
            minHeight: "auto",
            fontSize: "0.75rem",
          },
          "& .MuiDivider-root": {
            my: 0.5,
          },
          "& .MuiListItemText-primary": {
            fontSize: "0.75rem",
          },
        }}
      >
        <MenuItem onClick={handleNewSpreadsheet}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("menu.new")}</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleOpen} disabled>
          <ListItemIcon>
            <OpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("menu.open")}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleDuplicate} disabled>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("menu.duplicate")}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleRename} disabled>
          <ListItemIcon>
            <RenameIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("menu.rename")}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleDownload} disabled>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("menu.download")}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
