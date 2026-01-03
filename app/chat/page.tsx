/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { chatAction } from '@/app/actions/chat.actions'; 
import { MessageCircleDashed, Send, Bot, User } from 'lucide-react'; // Added icons

// Define the interface locally if not available in imports yet
interface Message {
  id: number;
  sender: 'user' | 'bot';
  message: string;
  modelName?: string;
}

export default function ChatInterface() {
    // --- State Management ---
    const [history, setHistory] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    // --- Refs ---
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Effects ---
    // Auto-scroll to bottom when history or loading changes
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [history, loading]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // --- Handlers ---
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault(); 

        const userMessage = message.trim();
        if (!userMessage || loading) return;

        const newMessage: Message = {
            id: Date.now(),
            sender: 'user',
            message: userMessage,
        };

        // 1. Update UI immediately (Optimistic)
        setHistory((prev) => [...prev, newMessage]);
        setMessage(''); 
        setError(null);

        // 2. Trigger the API call
        await askLLM(newMessage);
    };

    const askLLM = async (msg: Message) => {
        try {
            setLoading(true);
            
            // Call the Server Action
            const response = await chatAction(msg.message, 'gemini');

            if (response.error) {
                setError(response.error);
                // Optional: Remove the user message if it failed, or show error inline
                return;
            }

            const botReply = response.reply || "No response received.";

            const newBotMessage: Message = {
                id: Date.now() + 1, // Ensure distinct ID
                sender: 'bot',
                message: botReply,
                modelName: 'Gemini + MCP' 
            };

            setHistory((prev) => [...prev, newBotMessage]);
        } catch (err: any) {
            console.error("Client Error:", err);
            setError(err?.message || 'Something went wrong communicating with the server.');
        } finally {
            setLoading(false);
            // Re-focus input after sending
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    return (
        <div className="bg-gray-900 text-gray-100 h-screen w-screen flex items-center justify-center sm:p-4 font-sans">
            <div className="flex flex-col w-full max-w-3xl h-full sm:max-h-[90vh] bg-gray-800 sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-700">

                {/* --- Header --- */}
                <header className="flex items-center p-4 gap-4 border-b border-gray-700 bg-gray-800/50 backdrop-blur-md">
                    <div className="p-2 bg-teal-600/20 rounded-xl">
                        <MessageCircleDashed className="text-teal-400 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">Technyks Agent</h1>
                        <p className="text-xs text-teal-400 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                            Online & Ready
                        </p>
                    </div>
                </header>

                {/* --- Chat History --- */}
                <main
                    ref={chatContainerRef}
                    className="flex-grow p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-6"
                >
                    {history.length === 0 && !loading && (
                        <div className="flex flex-col justify-center items-center h-full text-center space-y-4 opacity-60">
                            <Bot size={48} className="text-gray-500" />
                            <p className="text-gray-400 text-sm">
                                Ask me anything about the documents.<br/>
                                I am powered by RAG and MCP tools.
                            </p>
                        </div>
                    )}

                    {history.map((item) => (
                        <div
                            key={item.id}
                            className={`flex w-full ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${item.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    item.sender === 'user' ? 'bg-teal-600' : 'bg-indigo-600'
                                }`}>
                                    {item.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>

                                {/* Bubble */}
                                <div className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-gray-400 mb-1 px-1">
                                        {item.sender === 'user' ? 'You' : item.modelName}
                                    </span>
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        item.sender === 'user' 
                                            ? 'bg-teal-600 text-white rounded-tr-sm' 
                                            : 'bg-gray-700 text-gray-100 rounded-tl-sm border border-gray-600'
                                    }`}>
                                        <p className="whitespace-pre-wrap">{item.message}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex justify-start w-full">
                            <div className="flex gap-3 max-w-[75%]">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <Bot size={14} />
                                </div>
                                <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-600 flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Processing tools...</span>
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* --- Input Form --- */}
                <footer className="p-4 border-t border-gray-700 bg-gray-800">
                    <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-full py-3 pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-white placeholder-gray-500"
                            placeholder="Type your message..."
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            className="absolute right-2 p-2 bg-teal-600 text-white rounded-full hover:bg-teal-500 disabled:opacity-50 disabled:hover:bg-teal-600 transition-colors shadow-lg"
                            disabled={loading || !message}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                    
                    {error && (
                        <div className="mt-3 p-2 bg-red-900/30 border border-red-800 rounded-lg text-center">
                            <p className="text-red-400 text-xs">{error}</p>
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
}
