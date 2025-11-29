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
          px: 0,
          py: 0,
          backgroundColor: "#fff",
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
