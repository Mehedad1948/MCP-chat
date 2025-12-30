// app/actions.ts
'use server'

export async function sendMessageToLLM(message: string): Promise<string> {
  // 1. Retrieve Environment Variables
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash"; // Default or from env

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }

  // 2. Construct the Gemini Endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 3. Prepare the Request Body (Gemini Format)
  const body = {
    contents: [
      {
        parts: [
          { text: message }
        ]
      }
    ]
  };

  try {
    // 4. Perform the Server-to-Server Fetch
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    // 5. Parse the Response
    const data = await response.json();

    // 6. Extract the text safely
    // Structure: data.candidates[0].content.parts[0].text
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      throw new Error("No response text found in Gemini output");
    }

    return reply;

  } catch (error) {
    console.error('Server Action Error:', error);
    // Re-throw or return a generic error message depending on your UI needs
    throw new Error("Failed to communicate with AI");
  }
}
