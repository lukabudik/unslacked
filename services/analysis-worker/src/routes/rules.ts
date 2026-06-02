import type { FastifyInstance } from "fastify";
import { approveInefficiency, getRoutingRules } from "@unslacked/db";

export async function rulesRoute(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/rules/:id/approve", async (req, reply) => {
    const ok = await approveInefficiency(req.params.id);
    if (!ok) return reply.status(404).send({ error: "not found" });
    return reply.send({ ok: true });
  });

  app.get("/rules", async (_req, reply) => {
    return reply.send({ rules: await getRoutingRules() });
  });
}
