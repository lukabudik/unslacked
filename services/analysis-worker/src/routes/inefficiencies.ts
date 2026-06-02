import type { FastifyInstance } from "fastify";
import { getInefficiencies } from "@unslacked/db";

export async function inefficienciesRoute(app: FastifyInstance) {
  app.get("/inefficiencies", async (_req, reply) => {
    return reply.send({ inefficiencies: await getInefficiencies() });
  });
}
