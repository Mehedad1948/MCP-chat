/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// IMPORTANT: Use the classic import path

export default function ChatInterface() {
    // =========================================================================
    // Classic AI SDK v3 useChat API
    // It manages the input, the changes, and the appending for you!
    // =========================================================================
    // const {
    //     messages,
    //     input,
    //     handleInputChange,
    //     handleSubmit,
    //     isLoading,
    //     error,
    //     append // Fully available to use programmatically if you ever need it
    // } = useChat({
    //     api: 'http://localhost:3001/api/chat', // Your Express endpoint
    //     onError: (err: any) => console.error('🔴 Chat Error details:', err),
    // });

    // console.log(' ✅ Input', input);


    // // --- Refs ---
    // const chatContainerRef = useRef<HTMLDivElement>(null);
    // const inputRef = useRef<HTMLInputElement>(null);

    // // --- Effects ---
    // useEffect(() => {
    //     // Auto-scroll to bottom when messages update
    //     if (chatContainerRef.current) {
    //         chatContainerRef.current.scrollTo({
    //             top: chatContainerRef.current.scrollHeight,
    //             behavior: 'smooth'
    //         });
    //     }
    // }, [messages, isLoading]);

    // useEffect(() => {
    //     // Auto-focus input on load
    //     inputRef.current?.focus();
    // }, []);

    return (
        <div className="bg-gray-900 text-gray-100 h-screen w-screen flex items-center justify-center sm:p-4 font-sans">
      
        </div>
    );
}
