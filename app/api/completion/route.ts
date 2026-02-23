import { generateText } from "ai";
import { google } from "@ai-sdk/google";
// https://mcp-chat-pink.vercel.app/api/completion
export async function POST() {
  const {text} = await  generateText({
        model: google("gemini-1.5-flash-001"),
        prompt: "Write a haiku about the ocean."

    })

    return Response.json({text})
}