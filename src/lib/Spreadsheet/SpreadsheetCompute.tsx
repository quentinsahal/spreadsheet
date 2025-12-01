import { Box, TextField, InputAdornment } from "@mui/material";
import FunctionsIcon from "@mui/icons-material/Functions";
import { useSpreadsheet } from "./SpreadsheetProvider";
import { getFirstCell } from "./helpers";

export function SpreadsheetCompute() {
  const { matrix, selectedCell, localLockedCell, draftValue, dispatch } =
    useSpreadsheet();

  // Show draft value if editing, otherwise show cell value
  const displayValue =
    draftValue !== null ? draftValue : selectedCell?.value ?? "";

  const isEditing = localLockedCell !== null;

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
        value={displayValue}
        onFocus={() => {
          if (!selectedCell) {
            dispatch({ type: "SELECT_CELL", cell: getFirstCell(matrix) });
            return;
          }
          // Lock the cell when focusing the formula bar (if not already editing)
          if (!isEditing) {
            dispatch({
              type: "LOCK_CELL",
              pos: { row: selectedCell.row, col: selectedCell.col },
            });
          }
        }}
        onChange={(e) => {
          if (selectedCell) {
            dispatch({ type: "SET_DRAFT_VALUE", value: e.target.value });
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
