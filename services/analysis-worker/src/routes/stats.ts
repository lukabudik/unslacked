import type { FastifyInstance } from "fastify";
import { getAnalysisStats } from "@unslacked/db";

export async function statsRoute(app: FastifyInstance) {
  app.get("/stats", async (_req, reply) => {
    return reply.send(await getAnalysisStats());
  });
}
