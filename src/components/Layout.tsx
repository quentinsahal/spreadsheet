import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Layout() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Box
        component="header"
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          px: 1.5,
          py: 0.25,
          backgroundColor: "#0e2548ff",
          borderBottom: "1px solid #2d4a6f",
        }}
      >
        <LanguageSwitcher />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
