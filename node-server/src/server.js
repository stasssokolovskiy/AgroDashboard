import Fastify from "fastify";
import cors from "@fastify/cors";
import f_static from "@fastify/static";
import postgres from "postgres";
import * as Arrow from "apache-arrow";
import path from "node:path";

const app = Fastify();

await app.register(cors, { origin: "*" });

await app.register(f_static, {
  root: path.join(import.meta.dirname, "../public"),
  prefix: "/dashboard/",
  redirect: true,
  extensions: ["html"],
});

app.get("/", async (req, reply) => {
  return reply.redirect("/dashboard/");
});

const user = encodeURIComponent(process.env.FRONTEND_DB_USER);
const pass = encodeURIComponent(process.env.FRONTEND_DB_PASSWORD);

const sql = postgres(`postgres://${user}:${pass}@${process.env.POSTGRES_ENDPOINT}`, {
  types: {
    bigint: postgres.BigInt,
    numeric: { to: 1700, from: [1700], parse: Number, serialize: String },
    date: { to: 1082, from: [1082], parse: (x) => new Date(x), serialize: (x) => x.toISOString() }
  }
});


app.post("/api/query", async (req, reply) => {
  try {
    const { strings, values } = req.body;
    strings.raw = strings;

    const rows = await sql(strings, ...values);
    const ipcBytes = Arrow.tableToIPC(Arrow.tableFromJSON(rows), "stream");

    return reply
      .type("application/vnd.apache.arrow.stream")
      .send(Buffer.from(ipcBytes));
  } catch (err) {
    reply.code(400).send({ error: err.message });
  }
});

const port = Number(process.env.PORT)

await app.listen({ port: port, host: "0.0.0.0"});
console.log(`Сервер запущен на порту ${port}`);

