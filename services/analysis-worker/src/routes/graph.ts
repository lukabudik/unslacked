import type { FastifyInstance } from "fastify";
import { getGraph } from "@unslacked/db";

export async function graphRoute(app: FastifyInstance) {
  app.get("/graph", async (_req, reply) => {
    return reply.send(await getGraph());
  });
}
