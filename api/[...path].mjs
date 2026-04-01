function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function normalizeBaseUrl(value) {
  if (!value) {
    return "";
  }

  return value.endsWith("/") ? value : `${value}/`;
}

export const runtime = "nodejs";

async function proxyRequest(request) {
  const backendBaseUrl = normalizeBaseUrl(process.env.RENDER_BACKEND_URL);

  if (!backendBaseUrl) {
    return jsonResponse(
      {
        message: "RENDER_BACKEND_URL is not configured on Vercel."
      },
      500
    );
  }

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(
    `${incomingUrl.pathname.replace(/^\/+/, "")}${incomingUrl.search}`,
    backendBaseUrl
  );

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));
  headers.delete("host");

  const init = {
    method: request.method,
    headers,
    redirect: "manual"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, init);
    const responseHeaders = new Headers(upstreamResponse.headers);

    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    const responseBody = request.method === "HEAD" ? null : await upstreamResponse.arrayBuffer();

    return new Response(responseBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return jsonResponse(
      {
        message: "Unable to reach the Render backend.",
        details: error instanceof Error ? error.message : String(error)
      },
      502
    );
  }
}

export async function GET(request) {
  return proxyRequest(request);
}

export async function POST(request) {
  return proxyRequest(request);
}

export async function PUT(request) {
  return proxyRequest(request);
}

export async function PATCH(request) {
  return proxyRequest(request);
}

export async function DELETE(request) {
  return proxyRequest(request);
}

export async function OPTIONS(request) {
  return proxyRequest(request);
}

export async function HEAD(request) {
  return proxyRequest(request);
}
