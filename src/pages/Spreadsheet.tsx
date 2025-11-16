import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { SpreadsheetHeader } from "../lib/Spreadsheet/SpreadsheetHeader";
import { SpreadsheetCanvas } from "../lib/Spreadsheet/SpreadSheetCanvas";
import { SpreadsheetProvider } from "../lib/Spreadsheet/SpreadsheetProvider";
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
  const navigate = useNavigate();

  const {
    mutate,
    data: createdData,
    isPending,
  } = useMutation({
    mutationKey: ["createSpreadsheet"],
    mutationFn: createSpreadsheet,
    onSuccess: (data) => {
      navigate(`/spreadsheet/${data.spreadsheetId}`, { replace: true });
    },
  });

  useEffect(() => {
    if (!id && !isPending && !createdData) {
      mutate();
    }
  }, [id, isPending, createdData, mutate]);

  const spreadsheetId = id || createdData?.spreadsheetId;

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
      spreadsheetId={spreadsheetId}
      wsUrl="ws://localhost:4000"
    >
      <SpreadsheetHeader />
      <SpreadsheetCanvas />
    </SpreadsheetProvider>
  );
}
