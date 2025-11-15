import { WebSocketServer, WebSocket } from "ws";
import Fastify from "fastify";
import { randomBytes } from "crypto";

const PORT = process.env.PORT || 4000;

// Create Fastify instance
const fastify = Fastify({ logger: true });

// Enable CORS
fastify.register(import("@fastify/cors"), {
  origin: true,
});

// Store spreadsheet data in memory
const spreadsheets = new Map<string, Map<string, string>>();

// Track clients by spreadsheet ID
const clients = new Map<string, Set<WebSocket>>();

// HTTP endpoint to create a new spreadsheet
fastify.post("/api/spreadsheet", async () => {
  const spreadsheetId = randomBytes(8).toString("hex");

  // Initialize empty spreadsheet
  spreadsheets.set(spreadsheetId, new Map());

  return { spreadsheetId };
});

// HTTP endpoint to get spreadsheet data
fastify.get<{ Params: { id: string } }>(
  "/api/spreadsheet/:id",
  async (request, reply) => {
    const { id } = request.params;
    const spreadsheet = spreadsheets.get(id);

    if (!spreadsheet) {
      return reply.status(404).send({ error: "Spreadsheet not found" });
    }

    const cells = Array.from(spreadsheet.entries()).map(([key, value]) => {
      const [row, col] = key.split("-");
      return { row: parseInt(row), col: parseInt(col), value };
    });

    return { spreadsheetId: id, cells };
  }
);

// Start Fastify server
const start = async () => {
  try {
    await fastify.listen({ port: PORT as number, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Get the underlying HTTP server from Fastify and attach WebSocket
const httpServer = fastify.server;
const wss = new WebSocketServer({ server: httpServer });

interface Message {
  type: "join" | "updateCell" | "focusCell" | "ping";
  spreadsheetId?: string;
  row?: number;
  col?: number;
  value?: string;
  userId?: string;
}

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");
  let currentSpreadsheetId: string | null = null;

  ws.on("message", (data: Buffer) => {
    try {
      const message: Message = JSON.parse(data.toString());

      console.log("Received message:", message);
      switch (message.type) {
        case "join": {
          const { spreadsheetId } = message;
          if (!spreadsheetId) return;

          currentSpreadsheetId = spreadsheetId;

          // Initialize spreadsheet if doesn't exist
          if (!spreadsheets.has(spreadsheetId)) {
            spreadsheets.set(spreadsheetId, new Map());
          }
          if (!clients.has(spreadsheetId)) {
            clients.set(spreadsheetId, new Set());
          }

          // Add client to room
          clients.get(spreadsheetId)!.add(ws);
          console.log(`Client joined spreadsheet: ${spreadsheetId}`);

          // Send initial data
          const cells = spreadsheets.get(spreadsheetId)!;
          const cellData = Array.from(cells.entries()).map(([key, value]) => {
            const [row, col] = key.split("-");
            return { row: parseInt(row), col: parseInt(col), value };
          });

          ws.send(
            JSON.stringify({
              type: "initialData",
              cells: cellData,
            })
          );
          break;
        }

        case "updateCell": {
          const { spreadsheetId, row, col, value } = message;
          if (!spreadsheetId || row === undefined || col === undefined) return;

          console.log(
            `Cell update: ${spreadsheetId} [${row},${col}] = ${value}`
          );

          // Store update
          const cells = spreadsheets.get(spreadsheetId);
          if (cells) {
            const key = `${row}-${col}`;
            cells.set(key, value || "");
          }

          // Broadcast to other clients in the same spreadsheet
          const roomClients = clients.get(spreadsheetId);
          if (roomClients) {
            const updateMessage = JSON.stringify({
              type: "cellUpdated",
              row,
              col,
              value,
            });

            roomClients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(updateMessage);
              }
            });
          }
          break;
        }

        case "focusCell": {
          const { spreadsheetId, row, col, userId } = message;
          if (!spreadsheetId || row === undefined || col === undefined) return;

          console.log(
            `Focus cell: ${spreadsheetId} [${row},${col}] by user ${userId}`
          );

          // Broadcast focus to other clients
          const roomClients = clients.get(spreadsheetId);
          if (roomClients) {
            const focusMessage = JSON.stringify({
              type: "cellFocused",
              row,
              col,
              userId,
            });

            roomClients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(focusMessage);
              }
            });
          }
          break;
        }

        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");

    // Remove client from all rooms
    if (currentSpreadsheetId) {
      const roomClients = clients.get(currentSpreadsheetId);
      if (roomClients) {
        roomClients.delete(ws);
        if (roomClients.size === 0) {
          clients.delete(currentSpreadsheetId);
        }
      }
    }
  });

  ws.on("error", (error: Error) => {
    console.error("WebSocket error:", error);
  });
});

// Remove the old HTTP server listener since Fastify handles it now
