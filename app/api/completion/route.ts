import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import OpenAI from 'openai';
// https://mcp-chat-pink.vercel.app/api/completion

export async function POST() {
    const openai = new OpenAI({
        baseURL: 'https://ai.liara.ir/api/6912c66eeb100b1c13f388bd/v1',
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXkiOiI2OTljOTRhYThiNmVjZDQ1ZjhmZjIxZjQiLCJ0eXBlIjoiYWlfa2V5IiwiaWF0IjoxNzcxODY5MzU0fQ.AcyGnzb39wY4QxOOvzcp4Jo2SHTqlJ0uDmz-bntBnIc',
    });

    //   const {text} = await  generateText({
    //         model: google("gemini-1.5-flash-001"),
    //         prompt: "Write a haiku about the ocean."

    //     })

    const completion = await openai.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [
            {
                role: 'user',
                content: 'معنای زندگی چیست؟',
            },
        ],
    });

    const text = completion.choices[0].message

    return Response.json({ text })
}