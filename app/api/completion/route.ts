import { generateText } from "ai";
import { google } from "@ai-sdk/google";
export async function POST() {
  const {text} = await  generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt: "Write a haiku about the ocean."

    })

    return Response.json({text})
}