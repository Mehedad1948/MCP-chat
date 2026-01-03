/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { generateAgentResponse } from '@/app/services/agent.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, model } = body;

    // Call the shared service
    const reply = await generateAgentResponse(message, model);

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('Error generating response:', error);
    
    const status = error.message === 'Message is required' || error.message === 'Invalid model specified' 
      ? 400 
      : 500;

    return NextResponse.json(
      { error: error.message || 'Failed to get a response from the AI.' },
      { status }
    );
  }
}
