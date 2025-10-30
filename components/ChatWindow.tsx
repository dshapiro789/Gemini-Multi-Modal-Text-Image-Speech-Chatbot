import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, ChatMessage, Part, StudyMode } from '../types';
import { useMultimodalChat } from '../hooks/useGeminiLive';
import { MicIcon } from './icons/MicIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { SendIcon } from './icons/SendIcon';
import { CloseIcon } from './icons/CloseIcon';
import { FunctionDeclaration } from '@google/genai';

// --- Sub-components ---

// Simple Markdown Renderer
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const html = text
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italics: *text*
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Newlines
    .replace(/\n/g, '<br />');

  return <p dangerouslySetInnerHTML={{ __html: html }} />;
};

// 1. Message Bubble
const MessageBubble: React.FC<{ message: ChatMessage; isLast: boolean }> = ({ message, isLast }) => {
  const isUser = message.role === 'user';
  const animationClass = isLast ? 'animate-slide-in-fade-in' : '';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${animationClass}`}>
      <div
        className={`max-w-prose p-3 rounded-lg ${
          isUser
            ? 'bg-[var(--primary-color)] text-white'
            : 'bg-gray-700 text-[var(--text-color)]'
        }`}
      >
        {message.parts.map((part, index) => {
          if (part.text) {
            return <SimpleMarkdown key={index} text={part.text} />;
          }
          if (part.inlineData) {
            return (
              <img
                key={index}
                src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                alt="User upload"
                className="max-w-xs rounded-lg mt-2"
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

// 2. Chat History
const ChatHistory: React.FC<{ messages: ChatMessage[], isSending: boolean }> = ({ messages, isSending }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  return (
    <div ref={scrollRef} className="flex-grow p-4 pt-24 overflow-y-auto">
      {messages.filter(msg => msg.role !== 'function').map((msg, index) => (
        <MessageBubble key={msg.timestamp} message={msg} isLast={index === messages.length - 1}/>
      ))}
       {isSending && (
        <div className="flex justify-start mb-4 animate-slide-in-fade-in">
          <div className="bg-gray-700 text-[var(--text-color)] p-3 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></span>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. Chat Input
const ChatInput: React.FC<{
  onSend: (prompt: string, image: Part | null) => void;
  isSending: boolean;
  placeholder?: string;
}> = ({ onSend, isSending, placeholder }) => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<Part | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null); // SpeechRecognition instance
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechRecognitionSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setPrompt(prev => prev + finalTranscript);
        }
      };
    } else {
        setIsSpeechRecognitionSupported(false);
    }
  }, []);

  const handleMicClick = () => {
    if (!isSpeechRecognitionSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSend = () => {
    if ((prompt.trim() || image) && !isSending) {
      onSend(prompt.trim(), image);
      setPrompt('');
      setImage(null);
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage({
          inlineData: {
            mimeType: file.type,
            data: (reader.result as string).split(',')[1],
          },
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);


  return (
    <div className="p-4 border-t border-gray-700">
      {image && (
        <div className="mb-2 relative w-24 h-24 p-1 border border-gray-600 rounded-lg">
          <img src={`data:${image.inlineData?.mimeType};base64,${image.inlineData?.data}`} alt="preview" className="w-full h-full object-cover rounded"/>
          <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-white"><CloseIcon className="w-4 h-4" /></button>
        </div>
      )}
      <div className="flex items-center bg-gray-800 rounded-lg p-2">
        <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
        <label htmlFor="file-upload" className="p-2 text-gray-400 hover:text-white cursor-pointer">
          <PaperclipIcon className="w-6 h-6" />
        </label>
        <textarea
          ref={textareaRef}
          rows={1}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={placeholder || "Type or talk..."}
          className="flex-grow bg-transparent focus:outline-none resize-none mx-2 text-lg max-h-40"
        />
        <button 
          onClick={handleMicClick} 
          disabled={!isSpeechRecognitionSupported}
          className={`p-2 ${isListening ? 'text-[var(--secondary-color)]' : 'text-gray-400'} hover:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isSpeechRecognitionSupported ? "Toggle voice input" : "Voice input not supported in this browser"}
        >
          <MicIcon className="w-6 h-6" />
        </button>
        <button onClick={handleSend} disabled={isSending || (!prompt.trim() && !image)} className="p-2 text-white bg-[var(--primary-color)] rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
          <SendIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// 4. Study Mode Selector
const StudyModeSelector: React.FC<{
    currentMode: StudyMode;
    onChange: (mode: StudyMode) => void;
}> = ({ currentMode, onChange }) => {
    const modes = [
        { id: StudyMode.EXPLAIN, label: 'Explain Concept' },
        { id: StudyMode.QUIZ, label: 'Quiz Me' },
        { id: StudyMode.SUMMARIZE, label: 'Summarize Text' },
    ];

    return (
        <div className="flex justify-center items-center gap-2 p-2 border-t border-b border-gray-700 bg-gray-800/50">
            <span className="text-sm font-medium text-gray-400 mr-2">Study Mode:</span>
            {modes.map(mode => (
                <button
                    key={mode.id}
                    onClick={() => onChange(mode.id)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        currentMode === mode.id
                            ? 'bg-[var(--primary-color)] text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                >
                    {mode.label}
                </button>
            ))}
        </div>
    );
};


// --- Main Component ---

interface ChatWindowProps {
  settings: AppSettings;
  tools: FunctionDeclaration[],
  onFunctionCall: (name: string, args: any) => Promise<any>;
  onSettingsChange: (newSettings: AppSettings) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ settings, tools, onFunctionCall, onSettingsChange }) => {
  const { chatHistory, isSending, error, sendMessage } = useMultimodalChat(settings, tools, onFunctionCall);
  const isStudyBuddyActive = settings.selectedPersonaId === 'study-buddy';

  const getPlaceholder = () => {
    if (!isStudyBuddyActive) {
        return 'Type or talk...';
    }
    switch(settings.selectedStudyMode) {
        case StudyMode.EXPLAIN: return 'Upload an image or paste a problem to explain...';
        case StudyMode.QUIZ: return 'What topic should I quiz you on?';
        case StudyMode.SUMMARIZE: return 'Paste text or upload an image to summarize...';
        default: return 'Select a study mode or ask a general question...';
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)' }}
    >
      <ChatHistory messages={chatHistory} isSending={isSending}/>
      {isStudyBuddyActive && (
          <StudyModeSelector 
            currentMode={settings.selectedStudyMode}
            onChange={(mode) => onSettingsChange({ ...settings, selectedStudyMode: mode })}
          />
      )}
      {error && <p className="text-red-400 text-center pb-2">{error}</p>}
      <ChatInput onSend={sendMessage} isSending={isSending} placeholder={getPlaceholder()} />
    </div>
  );
};