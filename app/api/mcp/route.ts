/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NextRequest, NextResponse } from "next/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "@/app/lib/mcp/server/mcpServer"; // Check this path matches your project
import { randomUUID } from "node:crypto";

// 1. Initialize Server Instance
const mcpServer = createMcpServer();

const USE_SESSIONS = true;

// Global map to store active sessions (In-memory)
// Note: This works for long-running servers. In Vercel serverless, this may reset.
const sessionsTransports: Record<string, StreamableHTTPServerTransport> = {};

// --- HELPER FUNCTIONS (From your pattern) ---

function getSessionTransport(sessionId?: string) {
  if (!USE_SESSIONS) return null;
  return sessionId ? sessionsTransports[sessionId] : null;
}

function createTransport() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: USE_SESSIONS ? () => randomUUID() : undefined,
    enableJsonResponse: true,
    onsessioninitialized: (sessionId) => {
      if (USE_SESSIONS) {
        sessionsTransports[sessionId] = transport;
      }
    },
  });

  if (USE_SESSIONS) {
    transport.onclose = () => {
      if (transport.sessionId) {
        delete sessionsTransports[transport.sessionId];
      }
    };
  }
  return transport;
}

// --- NODE.JS ADAPTERS (Critical for Next.js App Router) ---

/**
 * Adapter for POST requests (Command/Response)
 * Waits for the transport to write the full response, then returns NextResponse.
 */
async function handlePostAdapter(req: NextRequest, transport: StreamableHTTPServerTransport, body: any) {
  return new Promise<NextResponse>((resolve) => {
    // Mock Node.js Request
    const mockReq = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      body: body,
    };

    let responseData = "";
    let statusCode = 200;
    const responseHeaders: Record<string, string> = { "Content-Type": "application/json" };

    // Mock Node.js Response
    const mockRes = {
      setHeader: (key: string, value: string) => { responseHeaders[key] = value; },
      writeHead: (code: number, headers?: any) => {
        statusCode = code;
        if (headers) Object.assign(responseHeaders, headers);
      },
      write: (chunk: any) => { responseData += chunk; return true; },
      end: (chunk: any) => {
        if (chunk) responseData += chunk;
        resolve(new NextResponse(responseData, { status: statusCode, headers: responseHeaders }));
      },
    };

    // @ts-ignore Call SDK
    transport.handleRequest(mockReq, mockRes, body).catch((err) => {
      console.error("MCP Transport Error:", err);
      resolve(NextResponse.json({ error: "Internal Transport Error" }, { status: 500 }));
    });
  });
}

/**
 * Adapter for GET requests (SSE Stream)
 * Pipes the transport writes directly to a ReadableStream.
 */
function handleGetAdapter(req: NextRequest, transport: StreamableHTTPServerTransport) {
  const stream = new ReadableStream({
    start(controller) {
      const mockReq = {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
      };

      const mockRes = {
        setHeader: () => {}, 
        writeHead: () => {},
        write: (chunk: any) => {
          controller.enqueue(new TextEncoder().encode(chunk));
          return true;
        },
        end: () => {
          controller.close();
        },
      };

      // @ts-ignore Call SDK
      transport.handleRequest(mockReq, mockRes).catch((err) => controller.error(err));
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// --- ROUTE HANDLERS (Next.js Entry Points) ---

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("mcp-session-id") || undefined;
  
  // 1. Parse Body
  let body: any = {};
  try { body = await req.json(); } catch (e) { /* empty */ }

  let transport = getSessionTransport(sessionId);

  if (USE_SESSIONS) {
    // Check if this is an "initialize" request (manually check method if import unavailable)
    const isInitialize = body?.method === "initialize";

    if (!transport && isInitialize) {
      console.log("Initializing MCP session...");
      transport = createTransport();
      await mcpServer.connect(transport);
    }

    if (!transport) {
      return NextResponse.json(
        { error: { message: "No valid session provided" }, id: null },
        { status: 400 }
      );
    }
  } else {
    // Stateless Mode
    transport = createTransport();
    await mcpServer.connect(transport);
  }

  // 2. Delegate to Adapter
  return await handlePostAdapter(req, transport, body);
}

export async function GET(req: NextRequest) {
  if (!USE_SESSIONS) {
    return new NextResponse("GET not supported in stateless mode", { status: 400 });
  }

  const sessionId = req.headers.get("mcp-session-id") || undefined;
  const transport = getSessionTransport(sessionId);

  if (!transport) {
    return new NextResponse("Invalid or missing session ID", { status: 400 });
  }

  // 2. Delegate to Adapter
  return handleGetAdapter(req, transport);
}
