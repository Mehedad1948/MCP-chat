/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "@/app/lib/mcp/server/mcpServer"; // Ensure path matches
import { randomUUID } from "node:crypto";

const mcpServer = createMcpServer();
const USE_SESSIONS = true;

// In-memory store for sessions
const sessionsTransports: Record<string, StreamableHTTPServerTransport> = {};

// --- HELPERS ---

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

// --- ADAPTERS ---

async function handlePostAdapter(req: NextRequest, transport: StreamableHTTPServerTransport, parsedBody: any) {
  return new Promise<NextResponse>(async (resolve) => {
    let responseData = "";
    let statusCode = 200;
    const responseHeaders: Record<string, string> = { "Content-Type": "application/json" };

    // 1. MOCK RESPONSE
    const mockRes = {
      setHeader: (key: string, value: string) => { responseHeaders[key] = value; },
      writeHead: (code: number, headers?: any) => {
        statusCode = code;
        if (headers) Object.assign(responseHeaders, headers);
      },
      write: (chunk: any) => { responseData += chunk; return true; },
      end: (chunk: any) => {
        if (chunk) responseData += chunk;
        // Resolve the Promise to send response back to Next.js
        resolve(new NextResponse(responseData, { status: statusCode, headers: responseHeaders }));
      },
    };

    // 2. MOCK REQUEST
    // We explicitly set `body` so the SDK doesn't try to read the stream.
    // We also add empty stream methods to prevent crashes if the SDK tries to listen.
    const mockReq = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      body: parsedBody, // Express-style body injection
      
      // Dummy stream methods to satisfy generic IncomingMessage checks
      on: (event: string, callback: any) => {
        // If SDK tries to read data, trigger end immediately since we provided body
        if (event === 'end') callback(); 
        return mockReq;
      },
      removeListener: () => mockReq,
    };

    try {
      // 3. EXECUTE
      // We pass parsedBody as 3rd arg just in case, but mockReq.body is the standard Express way
      await transport.handleRequest(mockReq as any, mockRes as any, parsedBody);
    } catch (error) {
      console.error("MCP Handle Request Error:", error);
      resolve(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));
    }
  });
}

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

      transport.handleRequest(mockReq as any, mockRes as any).catch((err) => {
        console.error("MCP Stream Error:", err);
        controller.error(err);
      });
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

// --- ROUTE HANDLERS ---

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("mcp-session-id") || undefined;
  
  console.log('❤️❤️❤️ sessionId', sessionId);
  
  let body: any = {};
  try {
    const text = await req.text();
    // Only parse if there is content
    if (text) body = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse body:", e);
  }

  let transport = getSessionTransport(sessionId);

  // Initialize Logic
  if (USE_SESSIONS) {
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
    // Stateless fallback
    transport = createTransport();
    await mcpServer.connect(transport);
  }

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

  return handleGetAdapter(req, transport);
}
