import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import { useSpreadsheet } from "./SpreadsheetProvider";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({ open, onClose }: ShareDialogProps) {
  const { spreadsheetId } = useSpreadsheet();
  const [copied, setCopied] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const shareUrl = `${window.location.origin}/spreadsheet/${spreadsheetId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setShowSnackbar(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Spreadsheet",
          text: "Rejoignez ma feuille de calcul",
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    }
  };

  const supportsNativeShare = typeof navigator.share === "function";

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h6" component="span" fontWeight={500}>
            Partager
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Fermer">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {/* QR Code Section */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 3,
              mt: 1,
            }}
          >
            <Box
              sx={{
                p: 2,
                bgcolor: "white",
                borderRadius: 2,
                border: "1px solid #e0e0e0",
              }}
            >
              <QRCodeSVG
                value={shareUrl}
                size={200}
                level="M"
                includeMargin={false}
              />
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1.5 }}
            >
              Scannez pour rejoindre
            </Typography>
          </Box>

          {/* Link Section */}
          <TextField
            fullWidth
            value={shareUrl}
            size="small"
            slotProps={{
              input: {
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleCopyLink}
                      edge="end"
                      size="small"
                      aria-label="Copier le lien"
                    >
                      {copied ? (
                        <CheckIcon color="success" fontSize="small" />
                      ) : (
                        <CopyIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                bgcolor: "#f5f5f5",
              },
            }}
          />

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<CopyIcon />}
              onClick={handleCopyLink}
              sx={{ textTransform: "none" }}
            >
              Copier le lien
            </Button>

            {supportsNativeShare && (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ShareIcon />}
                onClick={handleNativeShare}
                sx={{ textTransform: "none" }}
              >
                Partager
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={2000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setShowSnackbar(false)}
        >
          Lien copié !
        </Alert>
      </Snackbar>
    </>
  );
}
