import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const server = app.listen(process.env.PORT || 3000);

const wss = new WebSocketServer({ server });

let viewers = new Map();

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = url.searchParams.get("role");
  const device = url.searchParams.get("device");

  console.log("connected:", role, device);

  if (role === "viewer") {
    if (!viewers.has(device)) viewers.set(device, new Set());
    viewers.get(device).add(ws);

    ws.on("close", () => {
      viewers.get(device)?.delete(ws);
    });
  }

  if (role === "device") {
    ws.on("message", (data) => {
      const deviceViewers = viewers.get(device);
      if (!deviceViewers) return;

      for (const viewer of deviceViewers) {
        if (viewer.readyState === 1) {
          viewer.send(data);
        }
      }
    });
  }
});

app.get("/", (req, res) => {
  res.send("WebSocket server running");
});
