import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { SpreadsheetHeader } from "../lib/Spreadsheet/SpreadsheetHeader";
import { SpreadsheetCanvas } from "../lib/Spreadsheet/SpreadSheetCanvas";
import { SpreadsheetProvider } from "../lib/Spreadsheet/SpreadsheetProvider";
import { useSpreadsheetConnector } from "../hooks/useSpreadsheetConnector";
import { useEffect } from "react";

const createSpreadsheet = async (): Promise<{ spreadsheetId: string }> => {
  const response = await fetch("http://localhost:4000/api/spreadsheet", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to create spreadsheet");
  }
  return response.json();
};

export function Spreadsheet() {
  const { id } = useParams<{ id: string }>();
  const { mutate, data, isPending } = useMutation({
    mutationFn: createSpreadsheet,
  });

  // If no ID in URL params, create a new spreadsheet
  useEffect(() => {
    if (!id) {
      mutate();
    }
  }, [id, mutate]);

  const spreadsheetId = id || data?.spreadsheetId;

  const { isConnected } = useSpreadsheetConnector({
    url: "ws://localhost:4000",
    spreadsheetId: spreadsheetId || "",
  });

  if (isPending || !spreadsheetId) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#666",
        }}
      >
        Creating spreadsheet...
      </div>
    );
  }

  return (
    <SpreadsheetProvider
      onCellUpdate={(row, col, value) => {
        console.log(row, col, value);
      }}
      onCellFocus={(row, col) => {
        console.log(row, col, "user-123");
      }}
    >
      <SpreadsheetHeader />
      <SpreadsheetCanvas />
      {!isConnected && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            padding: "8px 16px",
            background: "#ff4444",
            color: "white",
            borderRadius: "4px",
          }}
        >
          Disconnected
        </div>
      )}
    </SpreadsheetProvider>
  );
}
