import { WebSocketServer, WebSocket } from "ws";
import Fastify from "fastify";
import { randomBytes } from "crypto";
import Redis from "ioredis";

const PORT = process.env.PORT || 4000;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Redis clients
const redis = new Redis(REDIS_URL);
const redisPub = new Redis(REDIS_URL);
const redisSub = new Redis(REDIS_URL);

// Debug: Log Redis connection
redis.on("connect", () => {
  console.log("✅ Connected to Redis at", REDIS_URL);
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

// Create Fastify instance
const fastify = Fastify({ logger: true });

// Enable CORS
fastify.register(import("@fastify/cors"), {
  origin: true,
});

// Health check endpoint
fastify.get("/health", async () => {
  try {
    // Check Redis connectivity
    await redis.ping();
    return { status: "healthy", redis: "connected" };
  } catch (error) {
    return { status: "unhealthy", redis: "disconnected", error };
  }
});

// Track clients by spreadsheet ID
const clients = new Map<string, Set<WebSocket>>();

// Extend WebSocket to store user info directly
interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  userName?: string;
  spreadsheetId?: string;
  isAlive?: boolean;
}

// Redis helper functions
const getSpreadsheetKey = (id: string) => `spreadsheet:${id}:cells`;
const getActiveUsersKey = (id: string) => `spreadsheet:${id}:active_users`;
const getSelectionsKey = (id: string) => `spreadsheet:${id}:selections`;
const getLocksKey = (id: string) => `spreadsheet:${id}:locks`;
const getChannelKey = (id: string) => `spreadsheet:${id}:events`;

// Generate color from userName hash
const getUserColor = (userName: string): string => {
  const hash = userName
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

// HTTP endpoint to create a new spreadsheet
fastify.post("/api/spreadsheet", async () => {
  const spreadsheetId = randomBytes(8).toString("hex");

  // Initialize empty spreadsheet in Redis
  await redis.hset(getSpreadsheetKey(spreadsheetId), "initialized", "true");

  return { spreadsheetId };
});

// HTTP endpoint to get spreadsheet data
fastify.get<{ Params: { id: string } }>(
  "/api/spreadsheet/:id",
  async (request, reply) => {
    const { id } = request.params;

    // Just check if spreadsheet exists (has been initialized)
    const exists = await redis.hexists(getSpreadsheetKey(id), "initialized");

    if (!exists) {
      return reply.status(404).send({ error: "Spreadsheet not found" });
    }

    return { spreadsheetId: id, exists: true };
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
  type:
    | "join"
    | "updateCell"
    | "selectCell"
    | "lockCell"
    | "unlockCell"
    | "ping";
  spreadsheetId?: string;
  row?: number;
  col?: number;
  value?: string;
  userId?: string;
  userName?: string;
}

wss.on("connection", (ws: ExtendedWebSocket) => {
  console.log("Client connected");
  ws.isAlive = true;

  // Heartbeat - respond to pings
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", async (data: Buffer) => {
    try {
      const message: Message = JSON.parse(data.toString());

      console.log("Received message:", message);
      switch (message.type) {
        case "join": {
          const { spreadsheetId, userId, userName } = message;
          if (!spreadsheetId) return;

          // Store user info directly on WebSocket
          ws.spreadsheetId = spreadsheetId;
          ws.userId = userId;
          ws.userName = userName;

          // Store user info for this connection
          if (userId && userName) {
            // Add to Redis active users
            await redis.hset(
              getActiveUsersKey(spreadsheetId),
              userId,
              userName
            );
          }

          // Initialize clients map
          if (!clients.has(spreadsheetId)) {
            clients.set(spreadsheetId, new Set());
          }

          // Add client to room
          const roomClients = clients.get(spreadsheetId)!;
          roomClients.add(ws);
          console.log(
            `Client joined spreadsheet: ${spreadsheetId}${
              userName ? ` (${userName})` : ""
            }`
          );

          // Send initial cell data from Redis
          const cellsData = await redis.hgetall(
            getSpreadsheetKey(spreadsheetId)
          );
          const cellData = Object.entries(cellsData)
            .filter(([key]) => key !== "initialized")
            .map(([key, value]) => {
              const [row, col] = key.split("-");
              return { row: parseInt(row), col: parseInt(col), value };
            });

          // Get current locks (scan for lock keys)
          const lockPattern = `${getLocksKey(spreadsheetId)}:*`;
          const lockKeys = await redis.keys(lockPattern);
          const locks = await Promise.all(
            lockKeys.map(async (lockKey) => {
              const lockedBy = await redis.get(lockKey);
              const coords = lockKey.split(":").pop()!; // e.g., "0-1"
              const [row, col] = coords.split("-");
              return { row: parseInt(row), col: parseInt(col), lockedBy };
            })
          );

          // Get active users (excluding self)
          const activeUsersData = await redis.hgetall(
            getActiveUsersKey(spreadsheetId)
          );
          const activeUsers = Object.entries(activeUsersData)
            .filter(([id]) => id !== userId)
            .map(([id, name]) => ({ id, name }));

          // Get current selections from Redis
          const selectionsData = await redis.hgetall(
            getSelectionsKey(spreadsheetId)
          );
          const selections = Object.entries(selectionsData)
            .filter(([selUserId]) => selUserId !== userId)
            .map(([selUserId, selData]) => {
              const selection = JSON.parse(selData);
              return {
                userId: selUserId,
                userName: selection.userName,
                row: selection.row,
                col: selection.col,
                color: selection.color,
              };
            });

          // Send everything in one message
          ws.send(
            JSON.stringify({
              type: "initialData",
              cells: cellData,
              locks,
              activeUsers,
              selections,
            })
          );

          // Broadcast to others that new user joined
          const joinMessage = JSON.stringify({
            type: "userJoined",
            userId,
            userName,
          });

          roomClients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(joinMessage);
            }
          });

          break;
        }

        case "updateCell": {
          const { spreadsheetId, row, col, value } = message;
          if (!spreadsheetId || row === undefined || col === undefined) return;

          console.log(
            `Cell update: ${spreadsheetId} [${row},${col}] = ${value}`
          );

          // Store update in Redis
          const key = `${row}-${col}`;
          await redis.hset(getSpreadsheetKey(spreadsheetId), key, value || "");

          // Debug: Verify data was written
          const written = await redis.hget(
            getSpreadsheetKey(spreadsheetId),
            key
          );
          console.log(
            `✅ Verified Redis write: [${row},${col}] = "${written}"`
          );

          // Publish to channel for multi-server support
          await redisPub.publish(
            getChannelKey(spreadsheetId),
            JSON.stringify({
              type: "cellUpdated",
              row,
              col,
              value,
              fromServer: true,
            })
          );

          // Broadcast to other clients in the same spreadsheet (local server)
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

        case "lockCell": {
          const { spreadsheetId, row, col, userId } = message;
          console.log("lockCell received:", {
            spreadsheetId,
            row,
            col,
            userId,
          });

          if (
            !spreadsheetId ||
            row === undefined ||
            col === undefined ||
            !userId
          ) {
            console.log("lockCell validation failed - missing fields");
            return;
          }

          const key = `${row}-${col}`;
          const lockKey = `${getLocksKey(spreadsheetId)}:${key}`;
          console.log("Writing to Redis:", { lockKey, userId });

          // Set lock with 1 hour TTL
          await redis.setex(lockKey, 3600, userId);

          const payload = JSON.stringify({
            type: "cellLocked",
            row,
            col,
            userId,
          });

          const roomClients = clients.get(spreadsheetId) || new Set();
          roomClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          });

          break;
        }

        case "unlockCell": {
          const { spreadsheetId, row, col } = message;
          if (!spreadsheetId || row === undefined || col === undefined) return;

          const key = `${row}-${col}`;
          const lockKey = `${getLocksKey(spreadsheetId)}:${key}`;
          await redis.del(lockKey);

          const payload = JSON.stringify({
            type: "cellUnlocked",
            row,
            col,
          });

          const roomClients = clients.get(spreadsheetId) || new Set();
          roomClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          });

          break;
        }

        case "selectCell": {
          const { spreadsheetId, userId, userName, row, col } = message;
          if (
            !spreadsheetId ||
            !userId ||
            !userName ||
            row === undefined ||
            col === undefined
          )
            return;

          console.log(
            `Cell selected: ${spreadsheetId} [${row},${col}] by ${userName}`
          );

          const color = getUserColor(userName);

          // Store selection in Redis
          await redis.hset(
            getSelectionsKey(spreadsheetId),
            userId,
            JSON.stringify({ userName, row, col, color })
          );

          // Publish to channel
          await redisPub.publish(
            getChannelKey(spreadsheetId),
            JSON.stringify({
              type: "cellSelected",
              userId,
              userName,
              row,
              col,
              color,
              fromServer: true,
            })
          );

          // Broadcast selection to other clients in the same spreadsheet
          const roomClients = clients.get(spreadsheetId);
          if (roomClients) {
            const selectionMessage = JSON.stringify({
              type: "cellSelected",
              userId,
              userName,
              row,
              col,
              color,
            });

            roomClients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(selectionMessage);
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

  ws.on("close", async () => {
    console.log("Client disconnected");

    // Get user info from WebSocket
    const { userId, spreadsheetId } = ws;

    // Remove client from local map immediately
    if (spreadsheetId && userId) {
      const roomClients = clients.get(spreadsheetId);
      if (roomClients) {
        roomClients.delete(ws);

        // Don't immediately remove from Redis - give 5s grace period for reconnection
        setTimeout(async () => {
          // Check if user reconnected (Redis still has them but no local WS)
          const stillInRedis = await redis.hexists(
            getActiveUsersKey(spreadsheetId),
            userId
          );

          // Check if they have a new connection on THIS server
          const currentRoomClients = clients.get(spreadsheetId);
          const hasReconnected = currentRoomClients
            ? Array.from(currentRoomClients).some(
                (client: ExtendedWebSocket) => client.userId === userId
              )
            : false;

          // Only clean up if they didn't reconnect
          if (stillInRedis && !hasReconnected) {
            await redis.hdel(getActiveUsersKey(spreadsheetId), userId);
            await redis.hdel(getSelectionsKey(spreadsheetId), userId);

            // Publish user left event
            await redisPub.publish(
              getChannelKey(spreadsheetId),
              JSON.stringify({
                type: "userLeft",
                userId,
                fromServer: true,
              })
            );

            // Notify local clients
            const userLeftMessage = JSON.stringify({
              type: "userLeft",
              userId,
            });

            currentRoomClients?.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(userLeftMessage);
              }
            });
          }
        }, 5000); // 5 second grace period

        if (roomClients.size === 0) {
          clients.delete(spreadsheetId);
        }
      }
    }
  });

  ws.on("error", (error: Error) => {
    console.error("WebSocket error:", error);
    // Clean up on error to prevent memory leaks
    ws.terminate();
  });
});

// Subscribe to Redis pub/sub for multi-server support
redisSub.on("message", (channel: string, message: string) => {
  try {
    const data = JSON.parse(message);

    // Extract spreadsheet ID from channel name
    const spreadsheetId = channel
      .replace("spreadsheet:", "")
      .replace(":events", "");

    // Skip if fromServer to avoid double-broadcast on the origin server
    if (data.fromServer) {
      delete data.fromServer; // Remove internal flag before sending to clients
    }

    const roomClients = clients.get(spreadsheetId);
    if (roomClients) {
      roomClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  } catch (error) {
    console.error("Error handling Redis message:", error);
  }
});

// Subscribe to all spreadsheet events on startup
// In production, you'd subscribe dynamically when users join
redisSub.psubscribe("spreadsheet:*:events");

// Heartbeat to detect and clean up dead connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: ExtendedWebSocket) => {
    if (ws.isAlive === false) {
      console.log("Terminating dead connection");
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Check every 30 seconds

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

console.log("WebSocket server with Redis pub/sub ready");
