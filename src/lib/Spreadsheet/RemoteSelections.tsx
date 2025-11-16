import { useSpreadsheet } from "./SpreadsheetProvider";
import { config } from "./helpers";

export function RemoteSelections() {
  const { remoteSelections } = useSpreadsheet();

  return (
    <>
      {Array.from(remoteSelections.entries()).map(([userId, selection]) => {
        const { row, col, userName, color } = selection;

        // Calculate position based on cell coordinates
        const left = col * config.defaultColumnWidth;
        const top = row * config.defaultRowHeight;

        return (
          <div
            key={userId}
            style={{
              position: "absolute",
              left: `${left}px`,
              top: `${top}px`,
              width: `${config.defaultColumnWidth}px`,
              height: `${config.defaultRowHeight}px`,
              border: `2px solid ${color}`,
              boxSizing: "border-box",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {/* User avatar circle at bottom-right outside the selection */}
            <div
              style={{
                position: "absolute",
                bottom: "-18px",
                right: "-18px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: color,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "9px",
                fontWeight: "bold",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                border: "2px solid white",
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        );
      })}
    </>
  );
}
