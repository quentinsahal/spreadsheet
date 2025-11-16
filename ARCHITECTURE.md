# Collaborative Spreadsheet - Architecture Documentation

## Overview

A real-time collaborative spreadsheet application built with React, WebSockets, Redis, and Material UI. Multiple users can simultaneously edit cells, see each other's selections, and track active collaborators in real-time.

---

## Core Features

### 1. Real-Time Collaboration

- **Live Cell Editing**: Changes propagate instantly to all connected users
- **User Presence**: Display active users with avatars/names
- **Remote Selections**: Visualize where other users are currently focused (color-coded per user)
- **Multi-Server Support**: Redis pub/sub enables horizontal scaling across multiple server instances

### 2. Data Persistence

- **Redis Storage**: All spreadsheet data persisted in Redis with AOF + RDB
- **Automatic Recovery**: Data survives server restarts
- **Per-Spreadsheet Isolation**: Each spreadsheet has its own Redis hash keys

### 3. User Experience

- **Connection Management**: Automatic reconnection with 5-second grace period
- **Error Handling**: Centralized error system with user-friendly messages
- **Loading States**: Prevent rendering before data arrives
- **Responsive Design**: Material UI components adapt to mobile/tablet/desktop
- **Spreadsheet Validation**: Invalid IDs redirect to homepage with error notification

---

## Architecture Decisions

### 1. **WebSocket Integration in SpreadsheetProvider**

**Decision**: Integrate WebSocket connection directly inside `SpreadsheetProvider` (React Context) rather than separating network and state layers.

**Why**:

- **Colocation**: State updates and network events are inherently coupled in real-time apps
- **Simpler Data Flow**: No prop drilling or event emitters between layers
- **Single Responsibility**: Provider manages "spreadsheet state" which includes remote updates
- **Developer Experience**: Consumer components use context hooks, unaware of networking details

**Trade-offs Made**:

✅ **Pros**:

- **Reduced Boilerplate**: No need for separate WebSocket wrapper component or HOC
- **Automatic Synchronization**: State updates immediately on message receipt
- **Type Safety**: Context provides typed access to both local and remote state
- **Testability**: Can mock WebSocket by mocking the hook, not the entire network layer

❌ **Cons**:

- **Tight Coupling**: Can't easily swap WebSocket for HTTP polling or SSE without refactoring
- **Provider Complexity**: Provider does both state management AND network I/O
- **Reusability**: Can't use spreadsheet without WebSocket connection (no offline-first mode)
- **Testing Challenges**: Must account for async WebSocket lifecycle in component tests

**Alternative Considered**: Separate `<WebSocketProvider>` wrapping `<SpreadsheetProvider>`

Rejected because:

- Adds indirection without clear benefit
- Still need to pass WebSocket instance down somehow (context or props)
- Real-time collaboration is core to spreadsheet, not optional feature
- No realistic scenario where spreadsheet works without WebSocket

**Implementation Pattern**:

```typescript
// SpreadsheetProvider.tsx
export function SpreadsheetProvider({ spreadsheetId, wsUrl, children }) {
  const [matrix, setMatrix] = useState<Matrix>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  // WebSocket integrated directly
  useSpreadsheetConnector({
    wsUrl,
    spreadsheetId,
    onInitialData: (cells, users, selections) => {
      // Direct state updates on message receipt
      setMatrix(createMatrixFromCells(cells));
      setActiveUsers(users);
    },
    onCellUpdate: (row, col, value) => {
      // Update matrix ref immediately
      matrixRef.current[col][row] = value;
      forceUpdate();
    },
  });

  return <SpreadsheetContext.Provider value={{ matrix, activeUsers, ... }}>
    {children}
  </SpreadsheetContext.Provider>;
}
```

**Why This Works**:

- Consumer components (`SpreadsheetCanvas`, `ActiveUsers`) just read context
- No awareness of network layer → easier to reason about
- All WebSocket complexity hidden in provider implementation
- Context API provides clean API surface: `const { matrix, updateCell } = useSpreadsheet()`

---

### 2. **Redis Multi-Server Pub/Sub Pattern**

**Decision**: Use 3 Redis connections (main, pub, sub) with channel-based event broadcasting.

**Why**:

- **Horizontal Scalability**: Multiple server instances can serve users collaborating on same spreadsheet
- **Eventual Consistency**: Changes on Server A propagate to users on Server B/C via pub/sub
- **Separation of Concerns**: Main for data ops, pub for broadcasting, sub for listening

**Implementation**:

```typescript
// Server A: User updates cell
await redis.hset(getSpreadsheetKey(id), key, value);
await redisPub.publish(channel, JSON.stringify({ type: "cellUpdated", ... }));

// Server B/C: Receive and broadcast to local clients
redisSub.on("message", (channel, message) => {
  roomClients.forEach(client => client.send(message));
});
```

---

### 3. **WebSocket Metadata Storage**

**Decision**: Store user data directly on WebSocket object instead of separate Map.

**Why**:

- **Memory Leak Prevention**: Map could grow unbounded if not cleaned properly
- **Simpler Cleanup**: When socket closes, metadata is automatically garbage collected
- **Direct Association**: `ws.userId`, `ws.userName`, `ws.spreadsheetId` tightly coupled to connection

---

### 4. **5-Second Reconnection Grace Period**

**Decision**: Don't immediately remove user from active list on disconnect.

**Why**:

- **Network Instability**: Brief disconnections (WiFi handoff, mobile network switch) are common
- **Prevent Flickering**: Avoids "User left" → "User joined" spam for temporary drops
- **Better UX**: Maintains user presence during page refresh or quick reconnects

**Implementation**:

```typescript
ws.on("close", async () => {
  setTimeout(async () => {
    // Check if user reconnected in the meantime
    const hasReconnected = currentRoomClients.some(
      (client) => client.userId === userId
    );
    if (!hasReconnected) {
      // Actually remove after 5 seconds
      await redis.hdel(getActiveUsersKey(spreadsheetId), userId);
    }
  }, 5000);
});
```

---

### 5. **Heartbeat/Ping-Pong for Dead Connection Cleanup**

**Decision**: Send periodic pings to detect and terminate unresponsive connections.

**Why**:

- **Zombie Connections**: WebSocket close events don't always fire (network issues, crashes)
- **Resource Management**: Dead connections consume server resources indefinitely
- **Proactive Cleanup**: Heartbeat detects and terminates stale connections

**Implementation**:

```typescript
setInterval(() => {
  wss.clients.forEach((ws: ExtendedWebSocket) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Every 30 seconds

ws.on("pong", () => {
  ws.isAlive = true; // Mark alive on pong response
});
```

---

6. Interfaces

**Type Hierarchy**:

```typescript
// Data layer
type Cell = Position & { value: string };

// UI layer
type CellView = Coords &
  Position & {
    width: number;
    height: number;
    value: string;
    name: string; // "A1", "B2", etc.
  };

// Collaboration layer
type ActiveUser = { id: string; name: string };
type UserSelection = {
  userId: string;
  userName: string;
  row: number;
  col: number;
  color: string;
};
```

---

### 7. **Centralized Error Mapping System**

**Decision**: Create `lib/errors.ts` with `ERROR_MESSAGES` and `getErrorMessage()` utility.

**Why**:

- **Single Source of Truth**: All error messages in one place
- **Type Safety**: `CAPITAL_CASE` error codes with TypeScript validation
- **i18n Ready**: Easy to swap for translation keys later
- **Consistent UX**: Same error format across the app
- **Query Param Driven**: `?error=NOT_FOUND&id=abc123` for shareable error states

**Implementation**:

```typescript
export const ERROR_MESSAGES = {
  NOT_FOUND: (id?: string) => `Spreadsheet ${id ? `"${id}"` : ""} not found`,
  CONNECTION_FAILED: () => "Failed to connect to server...",
  // ...
} as const;

export const getErrorMessage = (
  code: string | null,
  params?: Record<string, string>
): string => {
  if (!code || !(code in ERROR_MESSAGES)) return "";
  return ERROR_MESSAGES[code as ErrorCode](params?.id);
};
```

---

### 9. **React Compiler Integration**

**Decision**: Add React Compiler (babel-plugin-react-compiler) to auto-optimize components.

**Why**:

- **Auto-Memoization**: Eliminates manual `React.memo`, `useMemo`, `useCallback`
- **Performance**: Compiler analyzes dependencies and only re-renders what changed
- **Developer Experience**: Write natural code, compiler optimizes it
- **Future-Proof**: Aligns with React's direction (automatic optimization)

**Configuration**:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "18" }]],
      },
    }),
  ],
});
```

---

## Data Flow

### 1. User Joins Spreadsheet

```
Client                    Server                     Redis
  |                         |                          |
  |----join(id, userId)---->|                          |
  |                         |---HSET active_users----->|
  |                         |---HGETALL cells--------->|
  |                         |---HGETALL selections---->|
  |<---initialData----------|                          |
  |                         |---broadcast userJoined-->| (pub/sub)
```

### 2. User Updates Cell

```
Client                    Server                     Redis
  |                         |                          |
  |---updateCell(r,c,val)-->|                          |
  |                         |---HSET cell------------->|
  |                         |---PUBLISH cellUpdated--->| (pub/sub)
  |                         |                          |
  |                         |---broadcast cellUpdated->| (to local clients)
Other Clients <-------------|<---message from sub------| (from other servers)
```

### 3. User Selects Cell

```
Client                    Server                     Redis
  |                         |                          |
  |---selectCell(r,c)------>|                          |
  |                         |---HSET selections------->|
  |                         |---PUBLISH cellSelected-->| (pub/sub)
  |                         |                          |
  |                         |---broadcast cellSelected>| (to local clients)
Other Clients <-------------|<---message from sub------| (from other servers)
```

---

## Redis Schema

### Keys

```
spreadsheet:{id}:cells           HASH   { "row-col": "value" }
spreadsheet:{id}:active_users    HASH   { userId: userName }
spreadsheet:{id}:selections      HASH   { userId: JSON({row,col,color,userName}) }
spreadsheet:{id}:events          CHANNEL (pub/sub for cross-server sync)
```

### Example

```
HSET spreadsheet:abc123:cells "0-0" "Hello"
HSET spreadsheet:abc123:cells "1-2" "World"
HSET spreadsheet:abc123:active_users "user1" "Alice"
HSET spreadsheet:abc123:selections "user1" '{"row":0,"col":0,"color":"#1a73e8","userName":"Alice"}'
```

---

## Component Architecture

### State Management Hierarchy

```
SpreadsheetProvider (Context)
  ├── matrixRef (cell data)
  ├── selectedCell (current user focus)
  ├── activeUsers (presence list)
  ├── remoteSelections (other users' cursors)
  └── useSpreadsheetConnector (WebSocket bridge)
      └── useWebSocket (low-level connection)

SpreadsheetCanvas (UI)
  ├── SpreadsheetHeader (active users display)
  ├── ColumnHeaders
  ├── RowHeaders
  ├── Canvas (grid + cell content)
  ├── SelectedCell (current user highlight)
  └── RemoteSelections (other users' highlights)
```

### Hooks

- **useSpreadsheetConnector**: High-level WebSocket message handling (join, update, select)
- **useWebSocket**: Low-level connection management (connect, reconnect, close)
- **useResize**: Recalculate canvas dimensions on matrix changes
- **useRedraw**: **Centralized canvas repaint hook** - single point of control for all redraw operations, prevents redundant renders and ensures consistent paint cycle across all state updates

---

## WebSocket Message Protocol

### Client → Server

```typescript
{
  type: "join", spreadsheetId, userId, userName;
}
{
  type: "updateCell", spreadsheetId, row, col, value;
}
{
  type: "selectCell", spreadsheetId, userId, userName, row, col;
}
{
  type: "ping";
}
```

### Server → Client

```typescript
{ type: "initialData", cells: Cell[], activeUsers: ActiveUser[], selections: UserSelection[] }
{ type: "cellUpdated", row, col, value }
{ type: "cellSelected", userId, userName, row, col, color }
{ type: "userJoined", userId, userName }
{ type: "userLeft", userId }
{ type: "pong" }
```

---

## Trade-offs and Future Considerations

### Current Limitations

1. **No Authentication**: Anyone with spreadsheet ID can join (intentional for MVP)
2. **No Permissions**: All users have full edit access
3. **No Conflict Resolution**: Last write wins (acceptable for spreadsheet use case)
4. **Matrix Size**: Fixed 100 rows × 26 columns (could be dynamic)
5. **No Undo/Redo**: History not tracked
6. **No Input Debouncing**: Each keystroke sends WebSocket message immediately (could cause network overhead)
7. **No Cell Locking**: Multiple users can edit same cell simultaneously without coordination

### Potential Improvements

1. **Input Debouncing**: Batch rapid keystrokes (e.g., 300ms delay) to reduce WebSocket message frequency
2. **Optimistic Cell Locking**: Show visual indicator when another user is editing a cell, prevent concurrent edits
3. **Operational Transforms (OT)**: Handle concurrent edits more gracefully
4. **Cell Formulas**: Compute `=SUM(A1:A10)` and propagate changes
5. **Rich Text**: Bold, italic, colors, fonts
6. **Cell Merging**: Span multiple rows/columns
7. **Data Validation**: Restrict cell input (numbers only, date format, etc.)
8. **Export/Import**: CSV, Excel formats
9. **Version History**: Track changes over time
10. **Comments**: Cell-level annotations
11. **Offline Mode**: Local-first with sync on reconnect

---

## Performance Optimizations

### 1. React Compiler

Auto-memoizes components, reducing unnecessary re-renders.

### 2. Canvas Rendering

Direct canvas manipulation instead of rendering 2,600 DOM elements (100 rows × 26 cols).

### 3. WebSocket Batching

Could batch multiple cell updates into single message (not implemented yet).

### 4. Redis Pipelining

Could use `PIPELINE` for bulk operations (not critical at current scale).

### 5. Virtualized Scrolling (Lazy Loading)

**Virtualization**: Only render cells currently visible in viewport (windowing technique). For large spreadsheets (1000s of rows), rendering all DOM elements or canvas content causes performance issues. Virtual scrolling dynamically renders only what the user sees, dramatically reducing memory footprint and paint time.

**Implementation Strategy**:

- Calculate visible row/column range based on scroll position
- Render only cells within viewport + small buffer
- Recalculate on scroll events
- Libraries: `react-window`, `react-virtualized`, or custom implementation

---

## Deployment Considerations

### Environment Variables

```bash
PORT=4000
REDIS_URL=redis://localhost:6381
```

### Multi-Server Setup

1. Deploy multiple instances behind load balancer
2. Ensure all instances connect to same Redis
3. Redis pub/sub handles cross-instance communication
4. Sticky sessions NOT required (state in Redis)
