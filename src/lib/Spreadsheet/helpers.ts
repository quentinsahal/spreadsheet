import {
  type Matrix,
  Direction,
  type Coords,
  type CellView,
  type Position,
} from "../../typings";

export const config = {
  positionFromTop: 140,
  positionFromLeft: 0,
  defaultColumnWidth: 80,
  defaultRowHeight: 20,
  defaultColumns: 26,
  defaultRows: 100,
  rowHeaderWidth: 50,
  columnHeaderHeight: 20,
  strokeColor: "#c0bebeff",
  selectedHeadersBgColor: "rgba(26, 115, 232, 0.1)",
  strokeWidth: 0.5,
  textSize: 16,
  textFont: "Roboto",
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const createMatrix = (rows: number, cols: number) => {
  const _matrix = new Array(rows);
  for (let i = 0; i < rows; i++) {
    _matrix[i] = new Array(cols);
  }
  return _matrix;
};

export const hydrateMatrix = (
  matrix: Matrix,
  cells: Array<{ row: number; col: number; value: string }>
) => {
  cells.forEach(({ row, col, value }) => {
    if (matrix[col] && row < matrix[col].length) {
      matrix[col][row] = value;
    }
  });
  return matrix;
};

export const createMatrixFromCells = (
  cells: Array<{ row: number; col: number; value: string }>,
  rows: number = config.defaultRows,
  cols: number = config.defaultColumns
) => {
  const matrix = createMatrix(rows, cols);
  return hydrateMatrix(matrix, cells);
};

export const getFirstCell = (matrix: Matrix): CellView => {
  return {
    x: 0,
    y: 0,
    width: config.defaultColumnWidth,
    height: config.defaultRowHeight,
    value: matrix[0][0],
    row: 0,
    col: 0,
    name: `A1`,
  };
};

export const getCellFromPageCoord = (
  matrix: Matrix,
  coord: Coords
): CellView => {
  // coord.x/y already include header offsets (rowHeaderWidth, columnHeaderHeight)
  const position = {
    col: Math.floor(
      (coord.x - config.rowHeaderWidth) / config.defaultColumnWidth
    ),
    row: Math.floor(
      (coord.y - config.columnHeaderHeight) / config.defaultRowHeight
    ),
  };

  // Calculate cell position - no header offsets since SelectedCell is now inside canvas container
  const x = position.col * config.defaultColumnWidth;
  const y = position.row * config.defaultRowHeight;

  return {
    x,
    y,
    width: config.defaultColumnWidth,
    height: config.defaultRowHeight,
    value: matrix[position.col][position.row],
    row: position.row,
    col: position.col,
    name: `${ALPHABET[position.col]}${position.row + 1}`,
  };
};

export const getCellFromPosition = (
  matrix: Matrix,
  position: Position
): CellView => {
  // No header offsets - SelectedCell is inside canvas container
  const x = position.col * config.defaultColumnWidth;
  const y = position.row * config.defaultRowHeight;

  return {
    x,
    y,
    width: config.defaultColumnWidth,
    height: config.defaultRowHeight,
    value: matrix[position.col][position.row],
    row: position.row,
    col: position.col,
    name: `${ALPHABET[position.col]}${position.row + 1}`,
  };
};

export const resizeSheet = (canvas: HTMLCanvasElement, matrix: Matrix) => {
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  // Canvas size without headers (headers are now HTML elements positioned absolutely)
  canvas.width = matrix[0].length * config.defaultColumnWidth;
  canvas.height = matrix.length * config.defaultRowHeight;

  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";
};

export const clearSheet = (canvas: HTMLCanvasElement) => {
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

export const drawCell = (canvas: HTMLCanvasElement, cell: CellView) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  // Canvas coordinates are now relative to canvas origin (0,0)
  // cell.row and cell.col give us the grid position
  const x = cell.col * config.defaultColumnWidth;
  const y = cell.row * config.defaultRowHeight;

  ctx.strokeStyle = "#000000";
  ctx.font = `${config.textSize}px ${config.textFont}`;
  ctx.fillText(
    cell.value?.toString() || "",
    x + 5,
    y + config.defaultRowHeight / 2 + config.textSize / 2
  );
};

export const drawColumnsHeader = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const width = canvas.width;
  const columnWidth = config.defaultColumnWidth;

  for (let x = config.rowHeaderWidth; x <= width; x += columnWidth) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, config.defaultRowHeight);
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = config.strokeWidth;
    ctx.stroke();
    ctx.font = `${config.textSize}px ${config.textFont}`;
    ctx.fillText(
      ALPHABET[Math.floor(x / columnWidth)],
      x + config.defaultColumnWidth / 2,
      config.defaultRowHeight / 2 + config.textSize / 2
    );
  }
};

export const drawRowsHeader = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const height = canvas.height;
  const rowHeight = config.defaultRowHeight;

  // start at rowHeight just under the first row with column names
  for (let y = rowHeight; y <= height; y += rowHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(config.rowHeaderWidth, y);
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = config.strokeWidth;
    ctx.stroke();
    ctx.font = `${config.textSize}px Arial`;
    ctx.fillText(
      (y / rowHeight).toString(),
      config.rowHeaderWidth / 2 - 5,
      y + rowHeight / 2 + config.textSize / 2
    );
  }
};

export const drawGrid = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  // Vertical lines (columns) - start from 0 (no row header offset)
  for (let x = 0; x <= canvas.width; x += config.defaultColumnWidth) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = config.strokeWidth;
    ctx.stroke();
  }

  // Horizontal lines (rows) - start from 0 (no column header offset)
  for (let y = 0; y <= canvas.height; y += config.defaultRowHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = config.strokeWidth;
    ctx.stroke();
  }
};

export const drawSheetContent = (
  canvas: HTMLCanvasElement | null,
  matrix: Matrix
) => {
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  for (let col = 0; col < matrix.length; col++) {
    for (let row = 0; row < matrix[col].length; row++) {
      // No header offset - canvas starts at (0, 0)
      const x = col * config.defaultColumnWidth;
      const y = row * config.defaultRowHeight;

      const value = matrix[col][row];
      if (value !== undefined) {
        ctx.font = `${config.textSize}px ${config.textFont}`;
        ctx.fillStyle = "#000";
        ctx.fillText(
          value.toString(),
          x + 5,
          y + config.defaultRowHeight / 2 + config.textSize / 2
        );
      }
    }
  }
};

export const drawSheet = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  drawGrid(canvas);
};

export const keyToDirection = (key: string): Direction | null => {
  switch (key) {
    case "ArrowUp":
      return Direction.Up;
    case "ArrowDown":
      return Direction.Down;
    case "ArrowLeft":
      return Direction.Left;
    case "ArrowRight":
      return Direction.Right;
    default:
      return null;
  }
};

export const move = (
  matrix: Matrix,
  from: Pick<CellView, "x" | "y">,
  direction: Direction | null
) => {
  let [nextCol, nextRow] = [from.x, from.y];
  switch (direction) {
    case Direction.Up:
      if (from.y !== 0) {
        nextRow -= 1;
      }
      break;
    case Direction.Down:
      if (from.y !== matrix[0].length - 1) {
        nextRow += 1;
      }
      break;
    case Direction.Left:
      if (from.x !== 0) {
        nextCol -= 1;
      }
      break;
    case Direction.Right:
      if (from.x !== matrix.length - 1) {
        nextCol += 1;
      }
      break;
    default:
      break;
  }
  return getCellFromPosition(matrix, { col: nextCol, row: nextRow });
};
