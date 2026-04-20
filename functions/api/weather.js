export async function onRequest(context) {
  const { request, env } = context;

  // ===== GET 
  if (request.method === "GET") {
    const data = await env.WEATHER_KV.get("latest");
    return new Response(data || "{}", {
      headers: { "Content-Type": "application/json" }
    });
  }

  // ===== POST FRWOM CROW
  if (request.method === "POST") {
    const body = await request.json();

    // Token check
    if (body.token !== env.WEATHER_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    //  Save latest weather
    await env.WEATHER_KV.put("latest", JSON.stringify(body));

    return new Response("ok");
  }

  return new Response("Method not allowed", { status: 405 });
}
