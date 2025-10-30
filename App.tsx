import React, { useState, useEffect, useCallback } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { SettingsPanel } from './components/SettingsPanel';
import { AppSettings, AppMode, Persona } from './types';
import { DEFAULT_SETTINGS, PERSONAS, changeThemeFunctionDeclaration } from './constants';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { ToggleSwitch } from './components/ToggleSwitch';
import { VoiceConversationWindow } from './components/VoiceConversationWindow';

// --- Persona Selector Component ---
const PersonaSelector: React.FC<{
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ personas, selectedId, onSelect }) => (
  <div className="relative">
    <select
      value={selectedId}
      onChange={(e) => onSelect(e.target.value)}
      className="appearance-none bg-gray-800/80 border border-gray-700 text-white rounded-full py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
    >
      {personas.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
    </div>
  </div>
);

// --- Header Component ---
const AppHeader: React.FC<{
  settings: AppSettings;
  onPersonaSelect: (id: string) => void;
  onModeChange: (mode: AppMode) => void;
  onSettingsClick: () => void;
}> = ({ settings, onPersonaSelect, onModeChange, onSettingsClick }) => {
  return (
    <header 
        className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center"
        style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)'
        }}
    >
      <PersonaSelector 
        personas={PERSONAS}
        selectedId={settings.selectedPersonaId}
        onSelect={onPersonaSelect}
      />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-color)'}}>
            <span>Text</span>
            <ToggleSwitch
                checked={settings.appMode === AppMode.VOICE}
                onChange={(isChecked) => onModeChange(isChecked ? AppMode.VOICE : AppMode.TEXT)}
            />
            <span>Voice</span>
        </div>
        <button
          onClick={onSettingsClick}
          className="p-3 rounded-full transition-colors"
          style={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', color: 'var(--text-color)'}}
          aria-label="Open settings"
        >
          <SettingsIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};


function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  useEffect(() => {
    const selectedPersona = PERSONAS.find(p => p.id === settings.selectedPersonaId);
    if (selectedPersona) {
        let prompt = selectedPersona.systemPrompt;
        if (selectedPersona.id === 'language-tutor') {
            prompt += ` The user's target language is ${settings.languageTutorLang}.`;
            // Add specific instructions for voice mode for immediate feedback
            if (settings.appMode === AppMode.VOICE) {
                prompt += ` After the user finishes speaking, you MUST provide immediate, concise feedback on their pronunciation and grammar, prefixed with "Feedback:", before continuing the conversation.`;
            }
        }
        setSettings(s => ({ ...s, systemPrompt: prompt }));
    }
  }, [settings.selectedPersonaId, settings.languageTutorLang, settings.appMode]);

  const handleFunctionCall = useCallback(async (name: string, args: any) => {
    console.log("Function Call:", name, args);
    if (name === 'changeTheme') {
        setSettings(prev => ({
            ...prev,
            ...(args.primaryColor && { primaryColor: args.primaryColor }),
            ...(args.backgroundColor && { backgroundColor: args.backgroundColor }),
            ...(args.textColor && { textColor: args.textColor }),
        }));
        return { success: true, message: `Theme changed successfully.` };
    }
    return { success: false, message: `Unknown function: ${name}` };
  }, []);
  
  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden font-sans">
      <style>{`
        :root {
          --primary-color: ${settings.primaryColor};
          --secondary-color: ${settings.secondaryColor};
          --background-color: ${settings.backgroundColor};
          --text-color: ${settings.textColor};
        }
      `}</style>
      
      <AppHeader
        settings={settings}
        onPersonaSelect={(id) => handleSettingsChange({ ...settings, selectedPersonaId: id })}
        onModeChange={(mode) => handleSettingsChange({ ...settings, appMode: mode })}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <div className="w-full h-full" style={{ backgroundColor: 'var(--background-color)'}}>
        {settings.appMode === AppMode.TEXT ? (
            <ChatWindow 
                settings={settings}
                tools={[changeThemeFunctionDeclaration]}
                onFunctionCall={handleFunctionCall}
            />
        ) : (
            <VoiceConversationWindow settings={settings} />
        )}
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
      {isSettingsOpen && (
        <div
          onClick={() => setIsSettingsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40"
        />
      )}
    </main>
  );
}

export default App;