import * as Arrow from "npm:apache-arrow";

export async function sql(strings, ...values) {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strings: Array.from(strings),
      values
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Error DB api");
  }

  const buffer = await res.arrayBuffer();
  const table = Arrow.tableFromIPC(new Uint8Array(buffer));

  table.columns = table.schema.fields.map((f) => f.name);

  return table;
}
