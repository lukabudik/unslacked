import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { World } from "./world.js";
import type { SimConfig } from "./orchestrator.js";

const PORT = 8787;

/**
 * Start the http + ws server. On ws connect, send the {t:"init"} snapshot,
 * then forward every World event as a protocol message to all clients.
 * Returns { url, close }.
 */
export function startServer(world: World, config: SimConfig) {
  const clients = new Set<WebSocket>();

  const http = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          users: world.users.size,
          channels: world.channels.size,
          clients: clients.size,
        }),
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server: http });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(
      JSON.stringify({
        t: "init",
        users: world.userList(),
        channels: world.channelList(),
        config,
      }),
    );
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  const broadcast = (msg: unknown) => {
    const data = JSON.stringify(msg);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  };

  // forward world events as protocol messages
  world.on("message", (message) => broadcast({ t: "message", message }));
  world.on("channel", (channel) => broadcast({ t: "channel", channel }));
  world.on("agent", (e) => broadcast({ t: "agent", ...e }));
  world.on("tick", (e) => broadcast({ t: "tick", ...e }));
  world.on("done", () => broadcast({ t: "done" }));

  http.listen(PORT);
  const url = `ws://localhost:${PORT}`;

  return {
    url,
    port: PORT,
    close: () =>
      new Promise<void>((resolve) => {
        for (const ws of clients) ws.close();
        wss.close(() => http.close(() => resolve()));
      }),
  };
}
