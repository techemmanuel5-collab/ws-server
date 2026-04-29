const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket server running");
});

const wss = new WebSocket.Server({ server });

const rooms = {}; // device rooms

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const role = url.searchParams.get('role');
  const device = url.searchParams.get('device');

  console.log("Connected:", role, device);

  if (!device) return;

  if (!rooms[device]) {
    rooms[device] = [];
  }

  ws.device = device;
  ws.role = role;

  rooms[device].push(ws);

  ws.on('message', (data) => {
    // broadcast to viewers only
    rooms[device].forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on('close', () => {
    rooms[device] = rooms[device].filter(c => c !== ws);
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
