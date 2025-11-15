import { Box, TextField, InputAdornment } from "@mui/material";
import FunctionsIcon from "@mui/icons-material/Functions";
import { useSpreadsheet } from "./SpreadsheetProvider";
import { getFirstCell } from "./helpers";

export function SpreadsheetCompute() {
  const { matrix, selectedCell, updateSelectedCell, updateCellContent } =
    useSpreadsheet();
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "center",
        px: 1,
        height: "40px",
      }}
    >
      <Box
        sx={{
          minWidth: 50,
          fontSize: "14px",
          color: "#444",
          pr: 1,
          borderRight: "1px solid #d3d3d3",
        }}
      >
        {selectedCell ? selectedCell.name : ""}
      </Box>
      <TextField
        fullWidth
        variant="outlined"
        value={selectedCell?.value ?? ""}
        onFocus={() => {
          if (!selectedCell) {
            updateSelectedCell(getFirstCell(matrix));
          }
        }}
        onChange={(e) => {
          if (selectedCell) {
            updateCellContent(
              { row: selectedCell.row, col: selectedCell.col },
              e.target.value
            );
          }
        }}
        size="small"
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "13px",
            backgroundColor: "#fff",
            paddingLeft: 0,
            "& fieldset": {
              border: "none",
            },
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <FunctionsIcon sx={{ fontSize: 18, color: "#5f6368" }} />
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
