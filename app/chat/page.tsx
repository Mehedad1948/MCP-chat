/* eslint-disable @typescript-eslint/no-explicit-any */
// chat/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message } from '@/interfaces/message';
import { chatAction } from '../actions/chat.actions'; // Updated Import: Using Server Action
import { MessageCircleDashed } from 'lucide-react';

export default function ChatInterface() {
    // --- State Management ---
    const [history, setHistory] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    // --- Refs ---
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // --- Effects ---
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [history]);

    // --- Handlers ---
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault(); // Prevent form reload

        const userMessage = message.trim();
        if (!userMessage || loading) return;

        const newMessage: Message = {
            id: Date.now(),
            sender: 'user',
            message: userMessage,
        };

        // Optimistic update: Add user message immediately
        setHistory((prev) => [...prev, newMessage]);
        setMessage(''); // Clear input

        await askLLM(newMessage);
    };

    const askLLM = async (msg: Message) => {
        try {
            setLoading(true);
            setError(null);

            // Updated Logic: Call the Server Action
            // We pass 'gemini' as the default model, similar to your controller logic
            const response = await chatAction(msg.message, 'gemini');

            if (response.error) {
                setError(response.error);
                return;
            }

            const botReply = response.reply || "No response received from AI.";

            const newBotMessage: Message = {
                id: Date.now(),
                sender: 'bot',
                message: botReply,
                modelName: 'Gemini' 
            };

            setHistory((prev) => [...prev, newBotMessage]);
        } catch (err: any) {
            console.error("Client Error:", err);
            setError(err?.message || 'Something went wrong communicating with the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 text-white h-screen w-screen flex items-center justify-center sm:p-4 font-sans">
            <div className="flex flex-col w-full max-w-2xl h-full sm:max-h-[90%] bg-gray-800 sm:rounded-3xl shadow-2xl overflow-hidden">

                {/* --- Header --- */}
                <header className="flex items-center p-4 gap-4 border-b border-gray-700">
                    <MessageCircleDashed />
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">Technyks AI Chat</h1>
                        <p className="text-sm md:text-base text-gray-400">Your AI assistant</p>
                    </div>
                </header>

                {/* --- Chat History --- */}
                <main
                    ref={chatContainerRef}
                    className="flex-grow p-4 overflow-y-auto scroll-smooth custom-scrollbar"
                >
                    <div className="flex flex-col space-y-4">

                        {/* No history found */}
                        {history.length === 0 && !loading && (
                            <div className="flex justify-center items-center h-full">
                                <p className="text-gray-500">Start the conversation by typing a message below.</p>
                            </div>
                        )}

                        {/* Chat Messages */}
                        {history.map((item, index) => (
                            <div
                                key={item.id || index}
                                className={`flex flex-col ${item.sender === 'user'
                                    ? 'self-end items-end'
                                    : 'self-start items-start'
                                    }`}
                            >
                                <p className={`mb-1 text-xs ${item.sender === 'user'
                                    ? 'text-teal-400 mr-3'
                                    : 'text-gray-400 ml-3'
                                    }`}>
                                    {item.sender === 'user' ? 'You' : (item.modelName || 'Jarvis Bot')}
                                </p>

                                <div
                                    className={`max-w-xs md:max-w-md lg:max-w-[85%] px-4 py-3 rounded-2xl ${item.sender === 'user'
                                        ? 'bg-teal-600'
                                        : 'bg-gray-700'
                                        }`}
                                >
                                    <p className={`text-sm ${item.sender === 'bot' ? 'whitespace-pre-wrap' : ''}`}>
                                        {item.message}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Bot Typing Indicator */}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="max-w-xs md:max-w-md lg:max-w-2xl animate-pulse">
                                    <div className="flex items-center">
                                        <span className="text-xs text-gray-400 ml-3">Bot is typing...</span>
                                        <span className="w-2 h-2 bg-teal-400 rounded-full ml-2 animate-pulse delay-75"></span>
                                        <span className="w-2 h-2 bg-teal-400 rounded-full ml-1 animate-pulse delay-150"></span>
                                        <span className="w-2 h-2 bg-teal-400 rounded-full ml-1 animate-pulse delay-300"></span>
                                    </div>
                                    {/* Skeleton Text */}
                                    <div className="mt-2 space-y-2 p-3 rounded-2xl bg-gray-700">
                                        <div className="h-2 bg-gray-600 rounded w-3/4"></div>
                                        <div className="h-2 bg-gray-600 rounded w-1/2"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* --- Input Form --- */}
                <footer className="p-4 border-t border-gray-700">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2 md:space-x-4">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="flex-grow bg-gray-700 border border-gray-600 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 text-white placeholder-gray-400"
                            placeholder="Type your message..."
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            className="bg-teal-600 text-white rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-teal-600/50 disabled:cursor-not-allowed"
                            disabled={loading || !message}
                        >
                            {/* Send Icon SVG */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
                            </svg>
                        </button>
                    </form>

                    {error && (
                        <p className="text-red-400 text-sm mt-2 text-center">
                            {error}
                        </p>
                    )}
                </footer>
            </div>
        </div>
    );
}
