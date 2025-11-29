import { useSpreadsheet } from "./SpreadsheetProvider";
import { config } from "./helpers";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function ColumnHeaders() {
  const { matrix, selectedCell } = useSpreadsheet();
  // Matrix is [rows][cols], so matrix[0].length gives us column count
  const columnCount = matrix[0]?.length || 0;

  return (
    <div
      style={{
        display: "flex",
        backgroundColor: "#fff",
      }}
    >
      {Array.from({ length: columnCount }, (_, index) => (
        <div
          key={index}
          style={{
            width: config.defaultColumnWidth,
            minWidth: config.defaultColumnWidth,
            maxWidth: config.defaultColumnWidth,
            height: config.columnHeaderHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: `${config.strokeWidth}px solid ${config.strokeColor}`,
            borderBottom: `${config.strokeWidth}px solid ${config.strokeColor}`,
            fontSize: config.textSize,
            fontFamily: config.textFont,
            boxSizing: "border-box",
            backgroundColor:
              selectedCell?.col === index
                ? config.selectedHeadersBgColor
                : "transparent",
          }}
        >
          {ALPHABET[index]}
        </div>
      ))}
      {/* Spacer to match vertical scrollbar width */}
      <div
        style={{
          width: config.scrollbarWidth,
          minWidth: config.scrollbarWidth,
          height: config.columnHeaderHeight,
        }}
      />
    </div>
  );
}
