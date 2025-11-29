import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getErrorMessage } from "../lib/errors";
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export function Homepage() {
  const savedName = sessionStorage.getItem("userName");
  const [name, setName] = useState(savedName || "");
  const [step, setStep] = useState<"name" | "action">(
    savedName ? "action" : "name"
  );
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);

  // Handle error from query params
  const errorCode = searchParams.get("error");
  const errorParams = {
    id: searchParams.get("id") || "",
  };

  const errorMessage = getErrorMessage(errorCode, errorParams);

  useEffect(() => {
    if (errorMessage && spreadsheetInputRef.current) {
      spreadsheetInputRef.current.focus();
    }
  }, [errorMessage]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      sessionStorage.setItem("userName", name.trim());

      // Check if there's a redirect URL
      const redirectUrl = searchParams.get("redirect");
      if (redirectUrl) {
        navigate(decodeURIComponent(redirectUrl), { replace: true });
        return;
      }

      setStep("action");
    }
  };

  const handleCreateNew = () => {
    navigate("/spreadsheet");
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (spreadsheetId.trim()) {
      navigate(`/spreadsheet/${spreadsheetId.trim()}`);
    }
  };

  const clearError = () => {
    searchParams.delete("error");
    searchParams.delete("id");
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #065f46 0%, #059669 35%, #10b981 70%, #6ee7b7 100%)",
        padding: 3,
      }}
    >
      {errorMessage && (
        <Alert
          severity="error"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={clearError}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            maxWidth: 400,
            width: "calc(100% - 48px)",
          }}
        >
          {errorMessage}
        </Alert>
      )}

      <Card
        sx={{
          padding: { xs: 3, sm: 6 },
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
      >
        {step === "name" ? (
          <>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              textAlign="center"
              fontWeight={600}
            >
              Join Spreadsheet
            </Typography>
            <Box component="form" onSubmit={handleNameSubmit} sx={{ mt: 4 }}>
              <TextField
                fullWidth
                label="Enter your name"
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
                sx={{ mb: 2 }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={!name.trim()}
              >
                Continue
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              textAlign="center"
              fontWeight={600}
            >
              Welcome, {name}!
            </Typography>
            <Box
              sx={{ mt: 4, display: "flex", flexDirection: "column", gap: 3 }}
            >
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleCreateNew}
                sx={{
                  background:
                    "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #047857 0%, #059669 100%)",
                  },
                }}
              >
                Create New Spreadsheet
              </Button>

              <Divider>
                <Typography variant="body2" color="text.secondary">
                  or
                </Typography>
              </Divider>

              <Box component="form" onSubmit={handleJoinExisting}>
                <TextField
                  fullWidth
                  label="Enter spreadsheet ID"
                  variant="outlined"
                  value={spreadsheetId}
                  onChange={(e) => {
                    setSpreadsheetId(e.target.value);
                    if (errorMessage) clearError();
                  }}
                  inputRef={spreadsheetInputRef}
                  autoFocus
                  required
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={!spreadsheetId.trim()}
                >
                  Join Existing Spreadsheet
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
}
