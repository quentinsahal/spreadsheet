import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SpreadsheetHeader } from "../lib/Spreadsheet/SpreadsheetHeader";
import { SpreadsheetCanvas } from "../lib/Spreadsheet/SpreadSheetCanvas";
import { SpreadsheetProvider } from "../lib/Spreadsheet/SpreadsheetProvider";
import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { config } from "../config";

const createSpreadsheet = async (): Promise<{ spreadsheetId: string }> => {
  const response = await fetch(`${config.apiUrl}/api/spreadsheet`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to create spreadsheet");
  }
  return response.json();
};

const checkSpreadsheetExists = async (
  id: string
): Promise<{ exists: boolean }> => {
  const response = await fetch(`${config.apiUrl}/api/spreadsheet/${id}`);
  return { exists: response.ok };
};

export function Spreadsheet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Check if spreadsheet exists
  const { data: existsData, isLoading: isCheckingExists } = useQuery({
    queryKey: ["checkSpreadsheet", id],
    queryFn: () => checkSpreadsheetExists(id!),
    enabled: !!id,
  });

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

  // Show error if spreadsheet doesn't exist, navigate to homepage with error param
  useEffect(() => {
    if (id && existsData && !existsData.exists) {
      navigate(`/?error=NOT_FOUND&id=${id}`);
    }
  }, [id, existsData, navigate]);

  const spreadsheetId = id || createdData?.spreadsheetId;

  if (isPending || !spreadsheetId || isCheckingExists) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <SpreadsheetProvider spreadsheetId={spreadsheetId} wsUrl={config.wsUrl}>
      <SpreadsheetHeader />
      <SpreadsheetCanvas />
    </SpreadsheetProvider>
  );
}
