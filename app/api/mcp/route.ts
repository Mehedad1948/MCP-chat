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
  console.log("[MCP Adapter] Starting POST Adapter...");

  return new Promise<NextResponse>((resolve) => {
    let responseData = "";
    let statusCode = 200;
    const responseHeaders: Record<string, string> = { "Content-Type": "application/json" };
    
    // 1. Prepare the body data for the SDK to read
    const bodyString = JSON.stringify(parsedBody);
    const bodyBuffer = Buffer.from(bodyString);

    const mockRes = {
      setHeader: (key: string, value: string) => { responseHeaders[key] = value; },
      writeHead: (code: number, headers?: any) => {
        statusCode = code;
        if (headers) Object.assign(responseHeaders, headers);
      },
      write: (chunk: any) => { responseData += chunk; return true; },
      end: (chunk: any) => {
        if (chunk) responseData += chunk;
        console.log(`[MCP Adapter] Response ready. Status: ${statusCode}`);
        
        resolve(new NextResponse(responseData, { 
            status: statusCode, 
            headers: responseHeaders 
        }));
      },
    };

    const urlObj = new URL(req.url);
    const relativeUrl = urlObj.pathname + urlObj.search;

    // 2. Mock Request that actually EMITS data
    const mockReq = {
      method: req.method,
      url: relativeUrl,
      // Merge headers, but enforce Content-Length so SDK knows how much to read
      headers: {
        ...Object.fromEntries(req.headers.entries()),
        "content-type": "application/json",
        "content-length": bodyBuffer.length.toString()
      },
      socket: {}, 
      
      on: (event: string, callback: any) => {
        if (event === 'data') {
          // Send the actual JSON string
          setImmediate(() => callback(bodyBuffer));
        }
        if (event === 'end') {
          // End the stream after data is sent
          setImmediate(() => callback());
        }
        return mockReq;
      },
      removeListener: () => mockReq,
    };

    try {
      transport.handleRequest(mockReq as any, mockRes as any)
        .catch((err) => {
            console.error("[MCP Adapter] Transport Error:", err);
            resolve(NextResponse.json({ error: "Transport Error" }, { status: 500 }));
        });
    } catch (error) {
      console.error("[MCP Adapter] Sync Error:", error);
      resolve(NextResponse.json({ error: "Adapter Error" }, { status: 500 }));
    }
  });
}

// Keep GET Adapter same as before (it works fine usually)
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
            try {
                controller.enqueue(new TextEncoder().encode(chunk));
            } catch(e) { /* Controller might be closed */ }
            return true;
        },
        end: () => {
             try { controller.close(); } catch(e) { /* Already closed */ }
        },
      };

      transport.handleRequest(mockReq as any, mockRes as any).catch((err) => {
         try { controller.error(err); } catch(e) {}
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

// --- MAIN ROUTE ---

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("mcp-session-id") || undefined;
  
  let body: any = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let transport = getSessionTransport(sessionId);

  if (USE_SESSIONS) {
    // If it's an 'initialize' request, we MUST create a transport regardless of session ID presence
    const isInitialize = body?.method === "initialize";

    if (isInitialize || !transport) {
      transport = createTransport();
      await mcpServer.connect(transport);
    }
  } else {
    transport = createTransport();
    await mcpServer.connect(transport);
  }

  if (!transport) {
      return NextResponse.json({ error: "Session not found" }, { status: 400 });
  }

  // Await the adapter result and return it
  return await handlePostAdapter(req, transport, body);
}

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get("mcp-session-id") || undefined;
  if (!sessionId) return new NextResponse("Session ID required", { status: 400 });
  
  const transport = getSessionTransport(sessionId);
  if (!transport) return new NextResponse("Invalid session", { status: 400 });

  return handleGetAdapter(req, transport);
}
