import http from "node:http";
import { gunzipSync } from "node:zlib";

// A stand-in for Sentry during e2e runs: e2e builds point NEXT_PUBLIC_SENTRY_DSN here
// (playwright.config.ts), global-setup starts it, and tests read what arrived from /events.
export const SENTRY_SINK = {
  port: 9999,
  dsn: "http://e2e@127.0.0.1:9999/1",
  events: "http://127.0.0.1:9999/events",
};

export async function startSentrySink(): Promise<() => Promise<void>> {
  const received: string[] = [];
  const server = http.createServer((req, res) => {
    // Browsers post envelopes cross-origin from the app.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") return res.end();
    if (req.method === "GET" && req.url === "/events") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(received));
    }
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      let body = Buffer.concat(chunks);
      if (req.headers["content-encoding"] === "gzip") body = gunzipSync(body);
      received.push(body.toString("utf8"));
      res.end("{}");
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(SENTRY_SINK.port, "127.0.0.1", resolve);
  });
  return () => new Promise<void>((resolve) => server.close(() => resolve()));
}
