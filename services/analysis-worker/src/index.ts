import Fastify from "fastify";
import cors from "@fastify/cors";
import { analyzeRoute } from "./routes/analyze.js";
import { suggestRoute } from "./routes/suggest.js";
import { rulesRoute } from "./routes/rules.js";
import { graphRoute } from "./routes/graph.js";
import { inefficienciesRoute } from "./routes/inefficiencies.js";
import { statsRoute } from "./routes/stats.js";

const app = Fastify({ logger: { level: "info" } });

await app.register(cors, { origin: "*" });
await app.register(analyzeRoute);
await app.register(suggestRoute);
await app.register(rulesRoute);
await app.register(graphRoute);
await app.register(inefficienciesRoute);
await app.register(statsRoute);

const port = parseInt(process.env.PORT ?? "8000");
await app.listen({ port, host: "0.0.0.0" });
