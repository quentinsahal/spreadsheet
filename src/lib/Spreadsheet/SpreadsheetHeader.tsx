import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Divider, InputBase } from "@mui/material";

import { SpreadsheetCompute } from "./SpreadsheetCompute";
import { ActiveUsers } from "./ActiveUsers";
import { useSpreadsheet } from "./SpreadsheetProvider";
import { FileMenu } from "./FileMenu";
import { ShareButton } from "./ShareButton";

export const SpreadsheetMenu = () => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>(t("spreadsheet.untitledName"));
  return (
    <Box sx={{ flex: 4, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <InputBase
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{
            height: 26,
            width: 220,
            fontFamily: "Roboto",
            fontSize: 18,
            backgroundColor: "#f5f5f5",
            mx: 0.5,
            px: 0.5,
            borderRadius: 1,
            "&:hover": {
              backgroundColor: "#e8e8e8",
            },
            "&.Mui-focused": {
              backgroundColor: "#fff",
              outline: "1px solid #1a73e8",
            },
          }}
        />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <FileMenu />
      </Box>
    </Box>
  );
};

export const SpreadsheetHeader = () => {
  const { activeUsers } = useSpreadsheet();
  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: 1.25,
          p: 0.625,
          height: 100,
          boxSizing: "border-box",
          backgroundColor: "#f8f8f8ff",
        }}
      >
        <Box
          sx={{
            flex: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            mt: 1.25,
          }}
        >
          <img src="/vite.svg" alt="Logo" width="40px" />
        </Box>
        <SpreadsheetMenu />
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1.25,
            width: "40%",
          }}
        >
          <ShareButton />
          <Divider orientation="vertical" sx={{ mx: 1, height: 40 }} />
          <ActiveUsers users={activeUsers} maxVisible={3} />
        </Box>
      </Box>
      <SpreadsheetCompute />
    </>
  );
};
