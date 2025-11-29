import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Share as ShareIcon } from "@mui/icons-material";
import { ShareDialog } from "./ShareDialog";

export function ShareButton() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Tooltip title="Partager">
        <IconButton
          onClick={() => setDialogOpen(true)}
          sx={{
            bgcolor: "primary.main",
            color: "white",
            width: 32,
            height: 32,
            "&:hover": {
              bgcolor: "primary.dark",
            },
          }}
        >
          <ShareIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <ShareDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
