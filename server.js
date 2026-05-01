const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket server running");
});

const wss = new WebSocket.Server({ server });
const rooms = {};

function getRoom(device) {
  if (!rooms[device]) {
    rooms[device] = new Set();
  }
  return rooms[device];
}

function sendToViewers(device, sender, data, isBinary) {
  const room = rooms[device];
  if (!room) return;

  for (const client of room) {
    if (
      client !== sender &&
      client.role === "viewer" &&
      client.readyState === WebSocket.OPEN
    ) {
      client.send(data, { binary: isBinary });
    }
  }
}

function sendToDevices(device, sender, data, isBinary) {
  const room = rooms[device];
  if (!room) return;

  for (const client of room) {
    if (
      client !== sender &&
      client.role === "device" &&
      client.readyState === WebSocket.OPEN
    ) {
      client.send(data, { binary: isBinary });
    }
  }
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const role = url.searchParams.get("role");
  const device = url.searchParams.get("device");

  console.log("Connected:", role, device);

  if (!device || !role) {
    ws.close();
    return;
  }

  if (role !== "device" && role !== "viewer") {
    ws.close();
    return;
  }

  const room = getRoom(device);

  ws.device = device;
  ws.role = role;
  room.add(ws);

  ws.on("message", (data, isBinary) => {
    // DEVICE -> VIEWERS
    // Device sends binary camera frames and text status JSON.
    if (ws.role === "device") {
      sendToViewers(device, ws, data, isBinary);

      if (isBinary) {
        // Do not log every camera frame.
      } else {
        console.log("Device text/status forwarded to viewers:", device);
      }

      return;
    }

    // VIEWER -> DEVICE
    // Viewer sends text JSON commands like camera_quality.
    if (ws.role === "viewer") {
      if (isBinary) {
        console.log("Ignoring binary message from viewer:", device);
        return;
      }

      sendToDevices(device, ws, data, false);
      console.log("Viewer text command forwarded to device:", device);
    }
  });

  ws.on("close", () => {
    rooms[device]?.delete(ws);

    if (rooms[device] && rooms[device].size === 0) {
      delete rooms[device];
    }

    console.log("Disconnected:", role, device);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", role, device, err.message);
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
