// FIX: Import React to support JSX syntax for icon components.
import React from 'react';
import { AppSettings, AppMode, Persona, StudyMode } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

// --- ICONS (Minimal inline SVGs for personas) ---
// FIX: Converted JSX to React.createElement calls to resolve parsing errors in .ts file.
const BotIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  React.createElement('svg', { className, viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M12 2a2 2 0 0 0-2 2v2a2 2 0 0 0 4 0V4a2 2 0 0 0-2-2zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" }),
    React.createElement('path', { d: "M0 0h24v24H0z", fill: "none" })
  )
);
// FIX: Converted JSX to React.createElement calls to resolve parsing errors in .ts file.
const BookIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  React.createElement('svg', { className, viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" })
  )
);
// FIX: Converted JSX to React.createElement calls to resolve parsing errors in .ts file.
const LanguageIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  React.createElement('svg', { className, viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 4.23-3.56c-.6 1.11-1.06 2.31-1.38 3.56zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" })
  )
);


export const PERSONAS: Persona[] = [
  {
    id: 'general',
    name: 'General Assistant',
    icon: BotIcon,
    systemPrompt: 'You are a friendly and helpful conversational AI assistant. You can answer questions, provide information, and help with a variety of tasks. Keep your responses concise and to the point unless asked for details.',
  },
  {
    id: 'study-buddy',
    name: 'Study Buddy',
    icon: BookIcon,
    systemPrompt: 'You are an enthusiastic and encouraging study buddy. Your goal is to help users learn and understand complex topics. Break down information, ask clarifying questions to check for understanding, and use analogies to explain concepts. Be patient and supportive.',
  },
  {
    id: 'language-tutor',
    name: 'Language Tutor',
    icon: LanguageIcon,
    systemPrompt: 'You are a friendly language tutor. The user is trying to learn a new language. Your role is to have a conversation with them in their target language. Keep your vocabulary and sentence structure simple at first. If the user makes a mistake, gently correct them and explain the correct usage. Encourage them to practice.',
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  systemPrompt: PERSONAS[0].systemPrompt,
  voice: 'Zephyr',
  pitch: 0,
  speakingRate: 1.0,
  primaryColor: '#6366F1', // Indigo 500
  secondaryColor: '#EC4899', // Pink 500
  backgroundColor: '#111827', // Gray 900
  textColor: '#F9FAFB', // Gray 50
  selectedPersonaId: 'general',
  languageTutorLang: 'Spanish',
  appMode: AppMode.TEXT,
  selectedStudyMode: StudyMode.NONE,
};

export const AVAILABLE_VOICES: AppSettings['voice'][] = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

export const changeThemeFunctionDeclaration: FunctionDeclaration = {
  name: 'changeTheme',
  description: 'Changes the color theme of the user interface.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      primaryColor: {
        type: Type.STRING,
        description: 'The new primary color for UI elements like buttons and highlights, in hex format (e.g., #FF5733).',
      },
      backgroundColor: {
        type: Type.STRING,
        description: 'The new background color for the application, in hex format (e.g., #333333).',
      },
      textColor: {
        type: Type.STRING,
        description: 'The new color for the main text, in hex format (e.g., #FFFFFF).',
      },
    },
    required: [],
  },
};