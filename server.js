const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket server running");
});

const wss = new WebSocket.Server({ server });
const rooms = {};

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const role = url.searchParams.get("role");
  const device = url.searchParams.get("device");

  console.log("Connected:", role, device);

  if (!device || !role) {
    ws.close();
    return;
  }

  if (!rooms[device]) rooms[device] = new Set();

  ws.device = device;
  ws.role = role;
  rooms[device].add(ws);

  ws.on("message", (data, isBinary) => {
    // Device sends camera/audio frames.
    // Forward only to viewers for same device.
    for (const client of rooms[device]) {
      if (
        client !== ws &&
        client.role === "viewer" &&
        client.readyState === WebSocket.OPEN
      ) {
        client.send(data, { binary: isBinary });
      }
    }
  });

  ws.on("close", () => {
    rooms[device]?.delete(ws);
    console.log("Disconnected:", role, device);
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
