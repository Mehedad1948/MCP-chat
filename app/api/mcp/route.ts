/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createMcpServer } from '@/app/lib/mcpServer';

// Initialize Server
const mcpServer = createMcpServer();

const USE_SESSIONS = true;
const sessionTransports: Record<string, StreamableHTTPServerTransport> = {};

// Helper: Get existing transport
function getSessionTransport(sessionId?: string) {
  if (!USE_SESSIONS) return null;
  return sessionId ? sessionTransports[sessionId] : null;
}

// Helper: Create new transport
function createTransport() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: USE_SESSIONS ? () => randomUUID() : undefined,
    enableJsonResponse: true,
    onsessioninitialized: (sessionId) => {
      if (USE_SESSIONS) {
        sessionTransports[sessionId] = transport;
      }
    },
  });

  if (USE_SESSIONS) {
    transport.onclose = () => {
      if (transport.sessionId) delete sessionTransports[transport.sessionId];
    };
  }
  return transport;
}

/**
 * ADAPTER: Helps Next.js talk to the Node.js-based MCP SDK
 * This function mocks a Node.js 'res' object and captures the output
 * to return it as a Next.js 'Response'.
 */
async function handleNodeAdapter(
  req: NextRequest, 
  transport: StreamableHTTPServerTransport, 
  body: any
): Promise<NextResponse> {
  
  return new Promise((resolve) => {
    // 1. Mock Node.js Request
    // We only need the headers mostly for the SDK to check auth/session
    const mockReq = {
      headers: Object.fromEntries(req.headers.entries()),
      method: req.method,
      url: req.url,
      body: body, // Some SDKs look at req.body directly
    };

    // 2. Mock Node.js Response
    // We capture the data written by the transport and resolve the Promise with a NextResponse
    let responseData = "";
    let statusCode = 200;
    const responseHeaders: Record<string, string> = { "Content-Type": "application/json" };

    const mockRes = {
      setHeader: (key: string, value: string) => {
        responseHeaders[key] = value;
      },
      writeHead: (code: number, headers?: any) => {
        statusCode = code;
        if (headers) Object.assign(responseHeaders, headers);
      },
      write: (chunk: any) => {
        responseData += chunk;
        return true;
      },
      end: (chunk: any) => {
        if (chunk) responseData += chunk;
        
        // When SDK calls end(), we resolve the Next.js response
        resolve(
          new NextResponse(responseData, {
            status: statusCode,
            headers: responseHeaders,
          })
        );
      },
    };

    // 3. Call the SDK's method (cast to any to bypass strict Node vs Web type mismatches)
    // The SDK expects (req, res, body)
    // @ts-expect-error
    transport.handleRequest(mockReq, mockRes, body).catch((err) => {
      console.error("MCP Transport Error:", err);
      resolve(NextResponse.json({ error: "Internal Transport Error" }, { status: 500 }));
    });
  });
}

// POST Handler (Client -> Server Messages)
export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("mcp-session-id") || undefined;
  let transport = getSessionTransport(sessionId);

  // Parse body
  let body;
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }

  // Session Logic
  if (USE_SESSIONS) {
    const isInit = body?.method === "initialize";
    
    if (!transport && isInit) {
      console.log("Initializing new MCP session...");
      transport = createTransport();
      await mcpServer.connect(transport);
    }

    if (!transport) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID provided" },
          id: null,
        },
        { status: 400 }
      );
    }
  } else {
    // Stateless Mode
    transport = createTransport();
    await mcpServer.connect(transport);
  }

  // Use Adapter to process the request
  return await handleNodeAdapter(req, transport, body);
}

// GET Handler (Server -> Client Events / SSE)
export async function GET(req: NextRequest) {
  if (!USE_SESSIONS) return new NextResponse("Stateless mode active", { status: 400 });

  const sessionId = req.headers.get("mcp-session-id") || undefined;
  const transport = getSessionTransport(sessionId);

  if (!transport) {
    return new NextResponse("Invalid or missing session ID", { status: 400 });
  }

  // For SSE, we need a ReadableStream.
  // We create a stream and pass a mock 'res' to the transport that writes to this stream.
  const stream = new ReadableStream({
    start(controller) {
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

      const mockReq = {
        headers: Object.fromEntries(req.headers.entries()),
        method: "GET",
        url: req.url,
      };

      // @ts-ignore
      transport.handleRequest(mockReq, mockRes).catch((err) => {
        console.error("SSE Error:", err);
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
