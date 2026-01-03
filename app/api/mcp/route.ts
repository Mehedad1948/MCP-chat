/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "@/app/lib/mcp/server/mcpServer"; 
import { randomUUID } from "node:crypto";

const mcpServer = createMcpServer();
const USE_SESSIONS = true;
const sessionsTransports: Record<string, StreamableHTTPServerTransport> = {};

function getSessionTransport(sessionId?: string) {
  if (!USE_SESSIONS) return null;
  return sessionId ? sessionsTransports[sessionId] : null;
}

function createTransport() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: USE_SESSIONS ? () => randomUUID() : undefined,
    enableJsonResponse: true,
    onsessioninitialized: (sessionId) => {
      if (USE_SESSIONS) sessionsTransports[sessionId] = transport;
    },
  });

  if (USE_SESSIONS) {
    transport.onclose = () => {
      if (transport.sessionId) delete sessionsTransports[transport.sessionId];
    };
  }
  return transport;
}

async function handlePostAdapter(req: NextRequest, transport: StreamableHTTPServerTransport, parsedBody: any) {
  console.log("[MCP Adapter] Starting Adapter...");

  return new Promise<NextResponse>((resolve) => {
    let responseData = "";
    let statusCode = 200;
    const responseHeaders: Record<string, string> = { "Content-Type": "application/json" };
    let isResolved = false;

    // Helper to ensure we only resolve once
    const safeResolve = (res: NextResponse) => {
      if (isResolved) return;
      isResolved = true;
      resolve(res);
    };

    const mockRes = {
      setHeader: (key: string, value: string) => { responseHeaders[key] = value; },
      writeHead: (code: number, headers?: any) => {
        statusCode = code;
        if (headers) Object.assign(responseHeaders, headers);
      },
      write: (chunk: any) => { responseData += chunk; return true; },
      end: (chunk: any) => {
        if (chunk) responseData += chunk;
        console.log(`[MCP Adapter] Response ended. Status: ${statusCode}, Data Length: ${responseData.length}`);
        
        // If SDK crashed (500) but sent no data, provide a fallback JSON so Next.js doesn't hang on empty response
        if (statusCode === 500 && responseData.length === 0) {
           console.error("[MCP Adapter] SDK sent 500 with empty body. Returning fallback error.");
           safeResolve(NextResponse.json({ 
             jsonrpc: "2.0", 
             error: { code: -32603, message: "Internal SDK Error (Empty 500 response)" }, 
             id: parsedBody?.id || null 
           }, { status: 500 }));
           return;
        }

        safeResolve(new NextResponse(responseData, { status: statusCode, headers: responseHeaders }));
      },
    };

    // Extract path from URL to avoid absolute URL confusion in Node SDKs
    const urlObj = new URL(req.url);
    const relativeUrl = urlObj.pathname + urlObj.search;

    const mockReq = {
      method: req.method,
      url: relativeUrl, // Send relative URL (e.g. /api/mcp) instead of http://localhost...
      headers: Object.fromEntries(req.headers.entries()),
      body: parsedBody,
      socket: {}, // Dummy socket to satisfy loose checks
      
      on: (event: string, callback: any) => {
        if (event === 'end') {
          // IMPORTANT: Trigger asynchronously to avoid race conditions during listener attachment
          setTimeout(() => {
            console.log("[MCP Adapter] Triggering async 'end' event");
            callback();
          }, 0);
        }
        return mockReq;
      },
      removeListener: () => mockReq,
    };

    try {
      // Execute
      transport.handleRequest(mockReq as any, mockRes as any, parsedBody)
        .catch((err) => {
            console.error("[MCP Adapter] Uncaught Transport Error:", err);
            safeResolve(NextResponse.json({ error: "Transport Execution Error" }, { status: 500 }));
        });
    } catch (error) {
      console.error("[MCP Adapter] Synchronous Error:", error);
      safeResolve(NextResponse.json({ error: "Internal Adapter Error" }, { status: 500 }));
    }
  });
}

function handleGetAdapter(req: NextRequest, transport: StreamableHTTPServerTransport) {
  const stream = new ReadableStream({
    start(controller) {
      const urlObj = new URL(req.url);
      const relativeUrl = urlObj.pathname + urlObj.search;

      const mockReq = {
        method: req.method,
        url: relativeUrl,
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
  
  let body: any = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch (e) {
    console.error("[POST] Body Parse Error:", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let transport = getSessionTransport(sessionId);

  if (USE_SESSIONS) {
    const isInitialize = body?.method === "initialize";

    if (!transport && isInitialize) {
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
    transport = createTransport();
    await mcpServer.connect(transport);
  }

  return await handlePostAdapter(req, transport, body);
}

export async function GET(req: NextRequest) {
  if (!USE_SESSIONS) return new NextResponse("GET not supported in stateless", { status: 400 });
  
  const sessionId = req.headers.get("mcp-session-id") || undefined;
  const transport = getSessionTransport(sessionId);

  if (!transport) return new NextResponse("Invalid session ID", { status: 400 });

  return handleGetAdapter(req, transport);
}
