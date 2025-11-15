import { useEffect } from "react";
import { clearSheet, drawSheet, drawSheetContent } from "../helpers";
import { useSpreadsheet } from "../SpreadsheetProvider";

export type UseRedrawProps = {
  canvas: HTMLCanvasElement | null;
  redrawTrigger: number;
};
export function useRedraw({ canvas, redrawTrigger }: UseRedrawProps) {
  const { matrix } = useSpreadsheet();

  // Single drawing logic - triggered by redrawTrigger
  useEffect(() => {
    if (!canvas) return;

    clearSheet(canvas);
    drawSheet(canvas);
    drawSheetContent(canvas, matrix);
    // We intentionnally want to depend only on redrawTrigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redrawTrigger]);
}
