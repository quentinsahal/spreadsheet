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

## Deployment Architecture

### Overview

Production deployment uses Nginx as a reverse proxy and load balancer, with multiple backend instances, Redis for state management, and RedisInsight for database administration.

```
Internet
    |
    ↓
[Nginx Reverse Proxy]
    |
    ├──> docs.qshop.space (Frontend - React App)
    ├──> api.qshop.space (Backend - WebSocket + HTTP)
    └──> admin.qshop.space (RedisInsight - Password Protected)
         |
         ↓
    [Redis Server]
```

---

### Domain Configuration

| Domain | Purpose | Backend | Protocol |
|--------|---------|---------|----------|
| `docs.qshop.space` | Web UI | React SPA (static files) | HTTP/HTTPS |
| `api.qshop.space` | API + WebSocket | Node.js backend instances | HTTP/HTTPS + WS/WSS |
| `admin.qshop.space` | Database Admin | RedisInsight | HTTP/HTTPS (Basic Auth) |

---

### Nginx Configuration

#### 1. **Frontend (docs.qshop.space)**

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name docs.qshop.space;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/docs.qshop.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.qshop.space/privkey.pem;

    root /var/www/spreadsheet/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json;

    # SPA routing - fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 2. **Backend (api.qshop.space) with Load Balancing**

```nginx
# Upstream backend instances
upstream backend_servers {
    least_conn; # Least connections algorithm
    server 127.0.0.1:4000 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4001 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4002 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name api.qshop.space;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.qshop.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.qshop.space/privkey.pem;

    # WebSocket + HTTP proxy
    location / {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;

        # WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-lived WebSocket connections
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

#### 3. **RedisInsight (admin.qshop.space) with Basic Auth**

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name admin.qshop.space;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/admin.qshop.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.qshop.space/privkey.pem;

    # Basic authentication
    auth_basic "Redis Administration";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:5540;
        proxy_http_version 1.1;

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for RedisInsight
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Create password file:**
```bash
# Install htpasswd utility
sudo apt-get install apache2-utils

# Create password for admin user
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Add more users (without -c flag)
sudo htpasswd /etc/nginx/.htpasswd viewer
```

---

### Environment Variables

#### Backend (.env)
```bash
# Server
PORT=4000  # Instance 1
# PORT=4001  # Instance 2
# PORT=4002  # Instance 3
NODE_ENV=production

# Redis
REDIS_URL=redis://localhost:6379

# CORS (allow frontend domain)
CORS_ORIGIN=https://docs.qshop.space
```

#### Frontend (.env.production)
```bash
VITE_API_URL=https://api.qshop.space
VITE_WS_URL=wss://api.qshop.space
```

---

### Deployment Steps

#### 1. **Setup Server Infrastructure**

```bash
# Install dependencies
sudo apt update
sudo apt install nginx redis-server nodejs npm certbot python3-certbot-nginx

# Enable and start services
sudo systemctl enable nginx redis-server
sudo systemctl start nginx redis-server
```

#### 2. **Configure Redis**

```bash
# Edit /etc/redis/redis.conf
bind 127.0.0.1  # Only local connections
protected-mode yes
maxmemory 2gb
maxmemory-policy allkeys-lru

# Enable persistence
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000

# Restart Redis
sudo systemctl restart redis-server
```

#### 3. **Deploy Backend Instances**

```bash
# Clone repository
git clone https://github.com/quentinsahal/spreadsheet.git /var/www/spreadsheet
cd /var/www/spreadsheet

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create systemd service files for each instance
sudo tee /etc/systemd/system/spreadsheet-api@.service > /dev/null <<'EOF'
[Unit]
Description=Spreadsheet API Instance %i
After=network.target redis-server.service
Requires=redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/spreadsheet
Environment="NODE_ENV=production"
Environment="PORT=%i"
Environment="REDIS_URL=redis://localhost:6379"
ExecStart=/usr/bin/node /var/www/spreadsheet/dist/server/index.js
Restart=always
RestartSec=10

# Security hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Enable and start instances
sudo systemctl daemon-reload
sudo systemctl enable spreadsheet-api@4000.service
sudo systemctl enable spreadsheet-api@4001.service
sudo systemctl enable spreadsheet-api@4002.service

sudo systemctl start spreadsheet-api@4000.service
sudo systemctl start spreadsheet-api@4001.service
sudo systemctl start spreadsheet-api@4002.service

# Check status
sudo systemctl status spreadsheet-api@4000.service
sudo systemctl status spreadsheet-api@4001.service
sudo systemctl status spreadsheet-api@4002.service
```

#### 4. **Deploy Frontend**

```bash
# Build production frontend
npm run build

# Frontend files are in dist/ directory
# Nginx will serve from /var/www/spreadsheet/dist
```

#### 5. **Setup SSL Certificates**

```bash
# Install certificates for all domains
sudo certbot --nginx -d docs.qshop.space
sudo certbot --nginx -d api.qshop.space
sudo certbot --nginx -d admin.qshop.space

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

#### 6. **Deploy RedisInsight**

```bash
# Run RedisInsight in Docker
docker run -d \
  --name redisinsight \
  -p 5540:5540 \
  -v redisinsight:/data \
  redis/redisinsight:latest

# Or using Docker Compose
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  redisinsight:
    image: redis/redisinsight:latest
    container_name: redisinsight
    ports:
      - "5540:5540"
    volumes:
      - redisinsight-data:/data
    restart: unless-stopped

volumes:
  redisinsight-data:
```

---

### Load Balancing Strategy

#### Why `least_conn`?

- **Better for WebSockets**: Long-lived connections benefit from balanced distribution
- **Dynamic Adjustment**: Routes new connections to least busy server
- **Stateless Architecture**: Redis stores state, so any backend can serve any request

#### Alternative Strategies

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| `round_robin` | Even request distribution | Simple, predictable | Doesn't account for connection duration |
| `least_conn` | Long-lived connections | Balances load dynamically | Slightly more overhead |
| `ip_hash` | Session affinity needed | Consistent routing | Not needed (state in Redis) |

**Decision**: `least_conn` chosen because WebSocket connections vary in duration and activity.

---

### Monitoring & Health Checks

#### Nginx Health Check

```nginx
# Add to backend upstream block
upstream backend_servers {
    least_conn;
    server 127.0.0.1:4000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4002 max_fails=3 fail_timeout=30s;
    
    # Health check (Nginx Plus feature, or use keepalive)
    keepalive 32;
}
```

#### Systemd Service Monitoring

```bash
# View all instances status
sudo systemctl status spreadsheet-api@*.service

# Monitor logs for specific instance
sudo journalctl -u spreadsheet-api@4000.service -f

# Monitor logs for all instances
sudo journalctl -u 'spreadsheet-api@*' -f

# View resource usage
sudo systemctl status spreadsheet-api@4000.service

# Restart failed instances automatically (configured in service file)
```

---

### Security Considerations

#### 1. **Firewall Rules**

```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# Redis and backend ports NOT exposed externally
# Only accessible via localhost
```

#### 2. **Redis Security**

```bash
# /etc/redis/redis.conf
requirepass your_strong_redis_password
bind 127.0.0.1  # Local only
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

#### 3. **Rate Limiting (Nginx)**

```nginx
# Define rate limit zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Apply to API endpoints
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://backend_servers;
}
```

---

### Scaling Strategy

#### Horizontal Scaling

1. **Add Backend Instance**:
   ```bash
   # Enable and start new instance
   sudo systemctl enable spreadsheet-api@4003.service
   sudo systemctl start spreadsheet-api@4003.service
   ```

2. **Update Nginx Upstream**:
   ```nginx
   upstream backend_servers {
       server 127.0.0.1:4000;
       server 127.0.0.1:4001;
       server 127.0.0.1:4002;
       server 127.0.0.1:4003;  # New instance
   }
   ```

3. **Reload Nginx**:
   ```bash
   sudo nginx -s reload
   ```

#### Vertical Scaling

- **Increase Redis Memory**: Edit `maxmemory` in redis.conf
- **Optimize Backend**: Increase Node.js heap size
  ```bash
  # Edit service file to add heap size option
  sudo systemctl edit spreadsheet-api@4000.service
  
  # Add this to the override:
  [Service]
  Environment="NODE_OPTIONS=--max-old-space-size=4096"
  
  # Reload and restart
  sudo systemctl daemon-reload
  sudo systemctl restart spreadsheet-api@4000.service
  ```

---

### Backup Strategy

#### Redis Backups

```bash
# Manual backup
redis-cli BGSAVE

# Automated daily backup (cron)
0 2 * * * redis-cli BGSAVE && cp /var/lib/redis/dump.rdb /backups/redis-$(date +\%Y\%m\%d).rdb
```

#### Application Backups

```bash
# Backup frontend build
tar -czf frontend-$(date +%Y%m%d).tar.gz /var/www/spreadsheet/dist

# Backup backend
tar -czf backend-$(date +%Y%m%d).tar.gz /var/www/spreadsheet/dist/server
```

---

### Troubleshooting

#### WebSocket Connection Issues

```bash
# Check Nginx WebSocket upgrade headers
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://api.qshop.space

# Check backend logs
sudo journalctl -u spreadsheet-api@4000.service -n 100

# Follow logs in real-time
sudo journalctl -u 'spreadsheet-api@*' -f

# Verify Redis connectivity
redis-cli ping
```

#### Performance Issues

```bash
# Check Nginx access logs
tail -f /var/log/nginx/access.log

# Monitor Redis performance
redis-cli --stat

# Monitor backend instances
sudo systemctl status spreadsheet-api@*.service

# Check resource usage
sudo journalctl -u spreadsheet-api@4000.service --since "1 hour ago" | grep -i error
```

---

## Deployment Considerations

### Environment Variables

```bash
PORT=4000
REDIS_URL=redis://localhost:6379
```

### Multi-Server Setup with Nginx

1. **Nginx as reverse proxy and load balancer** (least_conn algorithm)
2. **Multiple backend instances** (systemd service management)
3. **Single Redis instance** (all backends connect to same Redis)
4. **Redis pub/sub handles cross-instance communication**
5. **Sticky sessions NOT required** (state in Redis, any backend can serve any request)
6. **SSL/TLS termination at Nginx layer**
7. **Basic auth protection for RedisInsight admin panel**
8. **Automatic restart on failure** (systemd Restart=always)
