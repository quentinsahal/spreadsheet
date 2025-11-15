import { useSpreadsheet } from "./SpreadsheetProvider";
import { config } from "./helpers";

export function RowHeaders() {
  const { matrix, selectedCell } = useSpreadsheet();
  // Matrix is [rows][cols], so matrix.length gives us row count
  const rowCount = matrix.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
      }}
    >
      {Array.from({ length: rowCount }, (_, index) => (
        <div
          key={index}
          style={{
            width: config.rowHeaderWidth,
            minWidth: config.rowHeaderWidth,
            maxWidth: config.rowHeaderWidth,
            height: config.defaultRowHeight,
            minHeight: config.defaultRowHeight,
            maxHeight: config.defaultRowHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: `${config.strokeWidth}px solid ${config.strokeColor}`,
            borderBottom: `${config.strokeWidth}px solid ${config.strokeColor}`,
            fontSize: config.textSize,
            fontFamily: "Arial",
            boxSizing: "border-box",
            backgroundColor:
              selectedCell?.row === index
                ? config.selectedHeadersBgColor
                : "transparent",
          }}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );
}
