import React from 'react';
import { AppSettings, ConnectionState, LiveTranscriptEntry } from '../types';
import { useLiveConversation } from '../hooks/useGeminiLive';
import { MicIcon } from './icons/MicIcon';

const LiveTranscript: React.FC<{ transcript: LiveTranscriptEntry[] }> = ({ transcript }) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    return (
        <div ref={scrollRef} className="w-full max-w-4xl h-full p-4 md:p-8 text-lg md:text-2xl overflow-y-auto">
            {transcript.map((entry, index) => (
                <div key={index} className="mb-4">
                    <span className={`font-bold ${entry.speaker === 'user' ? 'text-[var(--primary-color)]' : 'text-[var(--secondary-color)]'}`}>
                        {entry.speaker === 'user' ? 'You: ' : 'AI: '}
                    </span>
                    <span>{entry.text}</span>
                </div>
            ))}
        </div>
    );
};

const MicButton: React.FC<{ connectionState: ConnectionState; onClick: () => void }> = ({ connectionState, onClick }) => {
    const isConnecting = connectionState === ConnectionState.CONNECTING;
    const isConnected = connectionState === ConnectionState.CONNECTED;

    const getButtonClass = () => {
        let baseClass = "rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg";
        if (isConnected) {
            return `${baseClass} bg-[var(--secondary-color)] animate-pulse`;
        }
        if (isConnecting) {
            return `${baseClass} bg-gray-500 cursor-not-allowed`;
        }
        return `${baseClass} bg-[var(--primary-color)] hover:bg-indigo-500`;
    };
    
    const getStatusText = () => {
        switch (connectionState) {
            case ConnectionState.IDLE: return "Tap to speak";
            case ConnectionState.CONNECTING: return "Connecting...";
            case ConnectionState.CONNECTED: return "Listening...";
            case ConnectionState.DISCONNECTING: return "Disconnecting...";
            case ConnectionState.ERROR: return "Error. Tap to retry.";
            default: return "";
        }
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={onClick}
                disabled={isConnecting}
                className={getButtonClass()}
                aria-label="Toggle conversation"
            >
                <MicIcon className="w-12 h-12 md:w-16 md:h-16 text-white" />
            </button>
            <p className="text-sm md:text-base h-6">{getStatusText()}</p>
        </div>
    );
};

export const VoiceConversationWindow: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const { connectionState, transcript, startConversation, stopConversation } = useLiveConversation(settings);

    const handleMicClick = () => {
        if (connectionState === ConnectionState.IDLE || connectionState === ConnectionState.ERROR) {
            startConversation();
        } else {
            stopConversation();
        }
    };

    return (
        <div
            className="w-full h-full flex flex-col items-center justify-end p-4 pb-16 md:pb-24"
            style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)' }}
        >
            <LiveTranscript transcript={transcript} />
            <div className="absolute bottom-12 md:bottom-20">
                <MicButton connectionState={connectionState} onClick={handleMicClick} />
            </div>
        </div>
    );
};
