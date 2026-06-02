import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { findSuggestion } from "@unslacked/db";

const SuggestBody = z.object({
  text: z.string(),
  mentionedUserId: z.string().optional(),
});

export async function suggestRoute(app: FastifyInstance) {
  app.post("/suggest", async (req, reply) => {
    const { text, mentionedUserId } = SuggestBody.parse(req.body);
    const suggestion = await findSuggestion(text, mentionedUserId);
    return reply.send({ suggestion });
  });
}
