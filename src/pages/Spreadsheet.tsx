import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SpreadsheetHeader } from "../lib/Spreadsheet/SpreadsheetHeader";
import { SpreadsheetCanvas } from "../lib/Spreadsheet/SpreadSheetCanvas";
import { SpreadsheetProvider } from "../lib/Spreadsheet/SpreadsheetProvider";
import { useSpreadsheetConnector } from "../hooks/useSpreadsheetConnector";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createMatrixFromCells } from "../lib/Spreadsheet/helpers";
import type { RemoteUpdate } from "../typings";

const createSpreadsheet = async (): Promise<{ spreadsheetId: string }> => {
  const response = await fetch("http://localhost:4000/api/spreadsheet", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to create spreadsheet");
  }
  return response.json();
};

const fetchSpreadsheet = async (
  id: string
): Promise<{
  spreadsheetId: string;
  cells: Array<{ row: number; col: number; value: string }>;
}> => {
  const response = await fetch(`http://localhost:4000/api/spreadsheet/${id}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch spreadsheet");
  }
  return response.json();
};

export function Spreadsheet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [remoteUpdate, setRemoteUpdate] = useState<RemoteUpdate | null>(null);

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

  const { data: spreadsheet, isLoading: isFetching } = useQuery({
    queryKey: ["spreadsheet", id],
    queryFn: () => fetchSpreadsheet(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!id && !isPending && !createdData) {
      mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isPending, createdData]);

  const matrix = useMemo(() => {
    if (spreadsheet?.cells) {
      return createMatrixFromCells(spreadsheet.cells);
    }
  }, [spreadsheet?.cells]);

  const spreadsheetId = id || createdData?.spreadsheetId;
  const isLoading = isPending || isFetching;

  const handleSync = useCallback((update: RemoteUpdate) => {
    setRemoteUpdate(update);
  }, []);

  const { updateCell, selectCell } = useSpreadsheetConnector({
    url: "ws://localhost:4000",
    spreadsheetId: spreadsheetId ?? "",
    sync: handleSync,
  });

  if (isLoading || !spreadsheetId || !matrix) {
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
      initialMatrix={matrix}
      spreadsheetId={spreadsheetId}
      remoteUpdate={remoteUpdate}
      onCellUpdate={(row, col, value) => {
        updateCell(row, col, value);
      }}
      onCellFocus={(row, col) => {
        console.log(row, col, "user-123");
      }}
      onCellClick={(row, col) => {
        selectCell(row, col);
      }}
    >
      <SpreadsheetHeader />
      <SpreadsheetCanvas />
    </SpreadsheetProvider>
  );
}
