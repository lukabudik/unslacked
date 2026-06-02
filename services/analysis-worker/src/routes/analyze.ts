import type { FastifyInstance } from "fastify";
import {
  clearAnalysis,
  getLastRunCompletedAt,
  startAnalysisRun,
  completeAnalysisRun,
} from "@unslacked/db";
import { runAnalysisLoop } from "../agent/loop.js";

export async function analyzeRoute(app: FastifyInstance) {
  app.post<{ Querystring: { full?: string; since?: string } }>("/analyze", async (req, reply) => {
    reply.hijack();
    const res = reply.raw;

    // Catch stream-level errors (EPIPE, connection reset) that would otherwise
    // become unhandled exceptions and crash the response mid-flight.
    res.on("error", (err) => {
      req.log.error({ err }, "SSE response stream error");
    });
    res.on("close", () => {
      if (!res.writableEnded) req.log.warn("SSE client disconnected before response finished");
    });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const send = (data: object) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const isFull = req.query.full === "true";
    const sinceOverride = req.query.since ? new Date(req.query.since) : null;
    const lastRunAt = sinceOverride ?? (isFull ? null : await getLastRunCompletedAt());
    const runId = await startAnalysisRun(isFull);

    if (isFull) await clearAnalysis();

    const mode = sinceOverride ? "since" : isFull ? "full" : "incremental";
    req.log.info({ mode, since: lastRunAt?.toISOString() ?? null }, "analysis run started");

    send({ type: "started", mode, since: lastRunAt?.toISOString() ?? null });

    try {
      const result = await runAnalysisLoop(lastRunAt, (event) => {
        if (event.phase) {
          req.log.info({ phase: event.phase }, "analysis phase");
          send({ type: "phase", phase: event.phase });
        } else {
          send({ type: "progress", worker: event.worker, toolName: event.toolName });
        }
      });
      await completeAnalysisRun(runId, result.messagesSeen);
      req.log.info(result, "analysis run complete");
      send({ type: "done", ...result });
    } catch (err) {
      req.log.error({ err, stack: err instanceof Error ? err.stack : undefined }, "analysis run failed");
      send({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      res.end();
    }
  });
}
