import { FunctionCall, FunctionResponse } from "@google/genai";

export interface Part {
  text?: string;
  inlineData?: {
    // FIX: Made mimeType optional to align with the @google/genai SDK's Part type.
    mimeType?: string;
    // FIX: Made data optional to align with the @google/genai SDK's Part type, resolving assignment errors.
    data?: string;
  };
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
}

export interface ChatMessage {
  // FIX: Added 'function' role to support tool responses in chat history.
  role: 'user' | 'model' | 'function';
  parts: Part[];
  timestamp: number;
}

export interface Persona {
  id: string;
  name: string;
  systemPrompt: string;
  icon: React.ComponentType<{ className?: string }>;
}

export enum AppMode {
    TEXT = 'TEXT',
    VOICE = 'VOICE',
}

export enum StudyMode {
    NONE = 'NONE',
    EXPLAIN = 'EXPLAIN',
    QUIZ = 'QUIZ',
    SUMMARIZE = 'SUMMARIZE',
}

export interface AppSettings {
  // AI Settings
  systemPrompt: string;
  voice: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  pitch: number;
  speakingRate: number;
  
  // UI Settings
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;

  // App State
  selectedPersonaId: string;
  languageTutorLang: string;
  appMode: AppMode;
  selectedStudyMode: StudyMode;
}

export enum ConnectionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  ERROR = 'ERROR',
}

export type LiveTranscriptEntry = {
    speaker: 'user' | 'model';
    text: string;
    isFinal: boolean;
}