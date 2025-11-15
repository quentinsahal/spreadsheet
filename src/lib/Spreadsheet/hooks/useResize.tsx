import { useEffect } from "react";
import { resizeSheet } from "../helpers";
import type { Matrix } from "../../../typings";

export function useResize(
  canvas: HTMLCanvasElement | null,
  matrix: Matrix,
  onResize: () => void
) {
  useEffect(() => {
    if (!canvas) return;

    const handleResize = () => {
      resizeSheet(canvas, matrix);
      onResize();
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [canvas, matrix]);
}
