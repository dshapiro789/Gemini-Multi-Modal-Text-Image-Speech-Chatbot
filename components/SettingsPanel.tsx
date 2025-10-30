import React, { useEffect } from 'react';
import { AppSettings, Persona } from '../types';
import { AVAILABLE_VOICES, PERSONAS } from '../constants';
import { CloseIcon } from './icons/CloseIcon';

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  onClose: () => void;
  isOpen: boolean;
}

const SettingsInput: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>
      {label}
    </label>
    {children}
  </div>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, onClose, isOpen }) => {
  const handleInputChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };
  
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.primaryColor);
    root.style.setProperty('--secondary-color', settings.secondaryColor);
    root.style.setProperty('--background-color', settings.backgroundColor);
    root.style.setProperty('--text-color', settings.textColor);
  }, [settings]);
  
  const selectedPersona = PERSONAS.find(p => p.id === settings.selectedPersonaId);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full max-w-sm transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ backgroundColor: 'var(--background-color)' }}
    >
      <div className="p-6 h-full flex flex-col shadow-2xl border-l border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>
            Customize
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--text-color)' }}
            aria-label="Close settings"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 flex-grow overflow-y-auto pr-2">
          <h3 className="text-lg font-semibold border-b border-gray-600 pb-2" style={{ color: 'var(--text-color)' }}>AI Settings</h3>
          
           <SettingsInput label="System Prompt">
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
              rows={6}
              className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-2 focus:outline-none transition"
              style={{ color: 'var(--text-color)', borderColor: 'var(--primary-color)' }}
            />
          </SettingsInput>
          
          {selectedPersona?.id === 'language-tutor' && (
             <SettingsInput label="Tutor Language">
                <select
                  value={settings.languageTutorLang}
                  onChange={(e) => handleInputChange('languageTutorLang', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-2 focus:outline-none transition"
                  style={{ color: 'var(--text-color)', borderColor: 'var(--primary-color)' }}
                >
                  {['Spanish', 'French', 'German', 'Italian', 'Japanese', 'Mandarin'].map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
             </SettingsInput>
          )}

          <SettingsInput label="Voice">
            <select
              value={settings.voice}
              onChange={(e) => handleInputChange('voice', e.target.value as AppSettings['voice'])}
              className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-2 focus:outline-none transition"
              style={{ color: 'var(--text-color)', borderColor: 'var(--primary-color)' }}
            >
              {AVAILABLE_VOICES.map((voice) => (
                <option key={voice} value={voice}>{voice}</option>
              ))}
            </select>
          </SettingsInput>

          <SettingsInput label={`Pitch: ${settings.pitch.toFixed(1)}`}>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={settings.pitch}
              onChange={(e) => handleInputChange('pitch', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-color)]"
            />
          </SettingsInput>

          <SettingsInput label={`Speed: ${settings.speakingRate.toFixed(2)}x`}>
            <input
              type="range"
              min="0.25"
              max="4.0"
              step="0.05"
              value={settings.speakingRate}
              onChange={(e) => handleInputChange('speakingRate', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-color)]"
            />
          </SettingsInput>
          
          <div className="text-xs text-gray-400 p-2 bg-gray-800/50 rounded-md space-y-1">
            <p>This assistant is powered by Google Gemini.</p>
          </div>

          <h3 className="text-lg font-semibold border-b border-gray-600 pb-2 pt-4" style={{ color: 'var(--text-color)' }}>Brand Colors</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <SettingsInput label="Primary">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                className="w-full h-10 p-1 bg-gray-800 border border-gray-600 rounded-md cursor-pointer"
              />
            </SettingsInput>
            <SettingsInput label="Secondary">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                className="w-full h-10 p-1 bg-gray-800 border border-gray-600 rounded-md cursor-pointer"
              />
            </SettingsInput>
            <SettingsInput label="Background">
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                className="w-full h-10 p-1 bg-gray-800 border border-gray-600 rounded-md cursor-pointer"
              />
            </SettingsInput>
            <SettingsInput label="Text">
              <input
                type="color"
                value={settings.textColor}
                onChange={(e) => handleInputChange('textColor', e.target.value)}
                className="w-full h-10 p-1 bg-gray-800 border border-gray-600 rounded-md cursor-pointer"
              />
            </SettingsInput>
          </div>
        </div>
      </div>
    </div>
  );
};
