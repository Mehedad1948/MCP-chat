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
  console.log(`[MCP Helper] Lookup session: ${sessionId}`);
  if (!USE_SESSIONS) return null;
  const transport = sessionId ? sessionsTransports[sessionId] : null;
  console.log(`[MCP Helper] Found transport? ${!!transport}`);
  return transport;
}

function createTransport() {
  console.log("[MCP Helper] Creating new transport...");
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: USE_SESSIONS ? () => {
      const id = randomUUID();
      console.log(`[MCP Helper] Generated new Session ID: ${id}`);
      return id;
    } : undefined,
    enableJsonResponse: true,
    onsessioninitialized: (sessionId) => {
      console.log(`[MCP Helper] Session initialized callback triggered for: ${sessionId}`);
      if (USE_SESSIONS) {
        sessionsTransports[sessionId] = transport;
        console.log(`[MCP Helper] Transport stored in memory. Total sessions: ${Object.keys(sessionsTransports).length}`);
      }
    },
  });

  if (USE_SESSIONS) {
    transport.onclose = () => {
      console.log(`[MCP Helper] Transport closed event. SessionId: ${transport.sessionId}`);
      if (transport.sessionId) {
        delete sessionsTransports[transport.sessionId];
        console.log(`[MCP Helper] Session removed from memory.`);
      }
    };
  }
  return transport;
}

// --- ADAPTERS ---

async function handlePostAdapter(req: NextRequest, transport: StreamableHTTPServerTransport, parsedBody: any) {
  console.log("[MCP Adapter] Starting handlePostAdapter...");
  
  return new Promise<NextResponse>(async (resolve) => {
    let responseData = "";
    let statusCode = 200;
    const responseHeaders: Record<string, string> = { "Content-Type": "application/json" };

    // 1. MOCK RESPONSE
    const mockRes = {
      setHeader: (key: string, value: string) => { 
        // console.log(`[MCP Adapter] MockRes setHeader: ${key}=${value}`);
        responseHeaders[key] = value; 
      },
      writeHead: (code: number, headers?: any) => {
        console.log(`[MCP Adapter] MockRes writeHead: ${code}`);
        statusCode = code;
        if (headers) Object.assign(responseHeaders, headers);
      },
      write: (chunk: any) => { 
        // console.log(`[MCP Adapter] MockRes write chunk length: ${chunk?.length}`);
        responseData += chunk; 
        return true; 
      },
      end: (chunk: any) => {
        console.log(`[MCP Adapter] MockRes END called. Total data length: ${responseData.length}`);
        if (chunk) responseData += chunk;
        
        // Resolve the Promise to send response back to Next.js
        console.log("[MCP Adapter] Resolving POST promise...");
        resolve(new NextResponse(responseData, { status: statusCode, headers: responseHeaders }));
      },
    };

    // 2. MOCK REQUEST
    const mockReq = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      body: parsedBody, 
      
      on: (event: string, callback: any) => {
        console.log(`[MCP Adapter] SDK added listener for event: '${event}'`);
        // If SDK tries to read data, trigger end immediately since we provided body
        if (event === 'end') {
            console.log("[MCP Adapter] Triggering immediate 'end' callback for SDK");
            callback(); 
        }
        return mockReq;
      },
      removeListener: (event: string) => {
        // console.log(`[MCP Adapter] SDK removed listener for event: '${event}'`);
        return mockReq;
      },
    };

    try {
      // 3. EXECUTE
      console.log("[MCP Adapter] Calling transport.handleRequest()...");
      console.log(`[MCP Adapter] Payload Method: ${parsedBody?.method}`);
      
      await transport.handleRequest(mockReq as any, mockRes as any, parsedBody);
      
      console.log("[MCP Adapter] transport.handleRequest() returned/completed.");
      // Note: We do NOT resolve here immediately. We wait for mockRes.end() to be called by the SDK.
      
    } catch (error) {
      console.error("[MCP Adapter] CRITICAL ERROR in handleRequest:", error);
      resolve(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));
    }
  });
}

function handleGetAdapter(req: NextRequest, transport: StreamableHTTPServerTransport) {
  console.log("[MCP GET Adapter] Starting stream setup...");
  const stream = new ReadableStream({
    start(controller) {
      console.log("[MCP GET Adapter] Stream started.");
      const mockReq = {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
      };

      const mockRes = {
        setHeader: () => {},
        writeHead: () => {},
        write: (chunk: any) => {
          console.log(`[MCP GET Adapter] Streaming chunk: ${chunk.length} bytes`);
          controller.enqueue(new TextEncoder().encode(chunk));
          return true;
        },
        end: () => {
          console.log("[MCP GET Adapter] Stream ended by SDK.");
          controller.close();
        },
      };

      transport.handleRequest(mockReq as any, mockRes as any).catch((err) => {
        console.error("[MCP GET Adapter] Stream Error:", err);
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
  console.log('--------------------------------------------------');
  console.log('❤️❤️❤️ [POST] Incoming Request');
  
  const sessionId = req.headers.get("mcp-session-id") || undefined;
  console.log(`❤️❤️❤️ [POST] Session ID Header: ${sessionId}`);
  
  let body: any = {};
  try {
    const text = await req.text();
    console.log(`❤️❤️❤️ [POST] Raw Body Length: ${text.length}`);
    if (text) {
        body = JSON.parse(text);
        console.log(`❤️❤️❤️ [POST] Parsed JSON Method: ${body.method}`);
        // console.log(`❤️❤️❤️ [POST] Body content:`, JSON.stringify(body, null, 2));
    }
  } catch (e) {
    console.error("❤️❤️❤️ [POST] Failed to parse body:", e);
  }

  let transport = getSessionTransport(sessionId);

  // Initialize Logic
  if (USE_SESSIONS) {
    const isInitialize = body?.method === "initialize";
    console.log(`❤️❤️❤️ [POST] Is Initialize Request? ${isInitialize}`);

    if (!transport && isInitialize) {
      console.log("❤️❤️❤️ [POST] No active transport found, initializing new session...");
      transport = createTransport();
      
      console.log("❤️❤️❤️ [POST] Connecting MCP Server to transport...");
      await mcpServer.connect(transport);
      console.log("❤️❤️❤️ [POST] MCP Server Connected.");
    }

    if (!transport) {
      console.warn("❤️❤️❤️ [POST] ERROR: No valid session provided and not an initialize request.");
      return NextResponse.json(
        { error: { message: "No valid session provided" }, id: null },
        { status: 400 }
      );
    }
  } else {
    // Stateless fallback
    console.log("❤️❤️❤️ [POST] Stateless mode active");
    transport = createTransport();
    await mcpServer.connect(transport);
  }

  console.log("❤️❤️❤️ [POST] Passing control to Adapter...");
  return await handlePostAdapter(req, transport, body);
}

export async function GET(req: NextRequest) {
  console.log('--------------------------------------------------');
  console.log('🔵🔵🔵 [GET] Incoming Request');

  if (!USE_SESSIONS) {
    console.warn("🔵🔵🔵 [GET] Failed: GET not supported in stateless mode");
    return new NextResponse("GET not supported in stateless mode", { status: 400 });
  }

  const sessionId = req.headers.get("mcp-session-id") || undefined;
  console.log(`🔵🔵🔵 [GET] Session ID Header: ${sessionId}`);

  const transport = getSessionTransport(sessionId);

  if (!transport) {
    console.warn("🔵🔵🔵 [GET] Failed: Invalid or missing session ID");
    return new NextResponse("Invalid or missing session ID", { status: 400 });
  }

  console.log("🔵🔵🔵 [GET] Passing control to Adapter...");
  return handleGetAdapter(req, transport);
}
