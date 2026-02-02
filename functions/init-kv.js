import { getStore } from "@netlify/blobs";

export async function handler() {
  const store = getStore("premium_state");
  await store.setJSON("init", {
    ok: true,
    createdAt: Date.now()
  });

  return {
    statusCode: 200,
    body: "KV store initialized"
  };
}
