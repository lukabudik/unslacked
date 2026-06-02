import type { FastifyInstance } from "fastify";
import {
  clearAnalysis,
  getLastRunCompletedAt,
  startAnalysisRun,
  completeAnalysisRun,
} from "@unslacked/db";
import { runAnalysisLoop } from "../agent/loop.js";

export async function analyzeRoute(app: FastifyInstance) {
  app.post<{ Querystring: { full?: string } }>("/analyze", async (req, reply) => {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const isFull = req.query.full === "true";
    const lastRunAt = isFull ? null : await getLastRunCompletedAt();
    const runId = await startAnalysisRun(isFull);

    if (isFull) await clearAnalysis();

    send({
      type: "started",
      mode: isFull ? "full" : "incremental",
      since: lastRunAt?.toISOString() ?? null,
    });

    try {
      const result = await runAnalysisLoop(lastRunAt, (event) => {
        if (event.phase) {
          send({ type: "phase", phase: event.phase });
        } else {
          send({ type: "progress", worker: event.worker, toolName: event.toolName });
        }
      });
      await completeAnalysisRun(runId, result.messagesSeen);
      send({ type: "done", ...result });
    } catch (err) {
      send({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      res.end();
    }
  });
}
