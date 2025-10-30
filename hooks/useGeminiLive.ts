import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, Part, GenerateContentResponse, FunctionDeclaration, LiveServerMessage, Transcription } from '@google/genai';
import { AppSettings, ConnectionState, ChatMessage, LiveTranscriptEntry } from '../types';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';

// --- Constants ---
const CHAT_MODEL_ID = 'gemini-2.5-pro';
const LIVE_MODEL_ID = 'gemini-2.5-flash-native-audio-preview-09-2025';
const TTS_MODEL_ID = 'gemini-2.5-flash-preview-tts';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const CHAT_HISTORY_STORAGE_KEY = 'gemini-chat-history';

// --- Hook for Text/Multimodal Chat ---
export const useMultimodalChat = (
    settings: AppSettings, 
    tools: FunctionDeclaration[],
    onFunctionCall: (name: string, args: any) => Promise<any>
) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          return parsedHistory;
        }
      }
    } catch (error) {
      console.error("Failed to load chat history from local storage:", error);
    }
    return [];
  });

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // Save chat history to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (error) {
      console.error("Failed to save chat history to local storage:", error);
    }
  }, [chatHistory]);


  const initializeAudio = useCallback(() => {
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text) return;
    initializeAudio();
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
            model: TTS_MODEL_ID,
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: settings.voice,
                        },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
            const audioContext = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
            
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, OUTPUT_SAMPLE_RATE, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            source.addEventListener('ended', () => {
                playingAudioSourcesRef.current.delete(source);
            });
            
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            playingAudioSourcesRef.current.add(source);
        }

    } catch (e) {
        console.error("TTS Error:", e);
        setError("Sorry, I couldn't generate a spoken response.");
    }
  }, [settings.voice, initializeAudio]);

  const sendMessage = useCallback(async (prompt: string, imagePart: Part | null) => {
    setIsSending(true);
    setError(null);

    const userParts: Part[] = [{ text: prompt }];
    if (imagePart) {
      userParts.unshift(imagePart);
    }
    const userMessage: ChatMessage = { role: 'user', parts: userParts, timestamp: Date.now() };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const contents = newHistory.map(msg => ({
        role: msg.role,
        parts: msg.parts,
      }));

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: CHAT_MODEL_ID,
        contents: contents,
        config: {
          systemInstruction: settings.systemPrompt,
          tools: [{ functionDeclarations: tools }],
        }
      });
      
      const modelResponsePart = response.candidates?.[0]?.content?.parts[0];
      
      if (!modelResponsePart) {
        throw new Error("Received an empty response from the model.");
      }

      if (modelResponsePart.functionCall) {
          const { name, args } = modelResponsePart.functionCall;
          const result = await onFunctionCall(name, args);
          
          const toolResponse: ChatMessage = {
              role: 'function',
              parts: [{
                  functionResponse: {
                      name: name,
                      response: result,
                  }
              }],
              timestamp: Date.now()
          };

          const modelMessageWithFunctionCall: ChatMessage = { role: 'model', parts: [modelResponsePart], timestamp: Date.now() };
          const historyWithFuncResponse = [...newHistory, modelMessageWithFunctionCall, toolResponse];
          setChatHistory(historyWithFuncResponse);
          
          const finalResponse = await ai.models.generateContent({
            model: CHAT_MODEL_ID,
            contents: historyWithFuncResponse.map(msg => ({ role: msg.role, parts: msg.parts })),
             config: {
              systemInstruction: settings.systemPrompt,
              tools: [{ functionDeclarations: tools }],
            }
          });

          const finalModelPart = finalResponse.candidates?.[0]?.content?.parts[0];
          if (finalModelPart?.text) {
              setChatHistory(prev => [...prev, { role: 'model', parts: [finalModelPart], timestamp: Date.now() }]);
              speak(finalModelPart.text);
          }

      } else if (modelResponsePart.text) {
          setChatHistory(prev => [...prev, { role: 'model', parts: [modelResponsePart], timestamp: Date.now() }]);
          speak(modelResponsePart.text);
      }

    } catch (e: any) {
      console.error('Send message error:', e);
      setError('Sorry, something went wrong. Please try again.');
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  }, [chatHistory, settings.systemPrompt, tools, speak, onFunctionCall]);

  useEffect(() => {
    return () => {
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
        }
        playingAudioSourcesRef.current.forEach(source => source.stop());
    };
  }, []);

  return { chatHistory, isSending, error, sendMessage, setChatHistory };
};


// --- Hook for Live Voice Conversation ---
export const useLiveConversation = (settings: AppSettings) => {
    const [connectionState, setConnectionState] = useState(ConnectionState.IDLE);
    const [transcript, setTranscript] = useState<LiveTranscriptEntry[]>([]);

    const sessionPromiseRef = useRef<any>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);

    const stopConversation = useCallback(async () => {
        if (!sessionPromiseRef.current) {
            return;
        }

        setConnectionState(ConnectionState.DISCONNECTING);
        
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        streamRef.current?.getTracks().forEach(track => track.stop());

        const sessionPromise = sessionPromiseRef.current;
        sessionPromiseRef.current = null;

        try {
            const session = await sessionPromise;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }

        if (inputAudioContextRef.current) {
            await inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current) {
            await outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }

        playingAudioSourcesRef.current.forEach(source => source.stop());
        playingAudioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;

        setConnectionState(ConnectionState.IDLE);
    }, []);

    const startConversation = useCallback(async () => {
        if (connectionState !== ConnectionState.IDLE && connectionState !== ConnectionState.ERROR) {
            return;
        }
        setConnectionState(ConnectionState.CONNECTING);
        setTranscript([]);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            sessionPromiseRef.current = ai.live.connect({
                model: LIVE_MODEL_ID,
                config: {
                    systemInstruction: settings.systemPrompt,
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: settings.voice }
                        }
                    }
                },
                callbacks: {
                    onopen: () => {
                        setConnectionState(ConnectionState.CONNECTED);
                        if (!inputAudioContextRef.current || !stream) return;
                        const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createPcmBlob(inputData);
                            sessionPromiseRef.current?.then((session: any) => {
                                if (session) {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                }
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const handleTranscription = (speaker: 'user' | 'model', textChunk: string, isFinal: boolean) => {
                            setTranscript(prev => {
                                const last = prev[prev.length - 1];
                                // If the last entry is for the same speaker and isn't final, append the text.
                                if (last && last.speaker === speaker && !last.isFinal) {
                                    const updatedEntry = { ...last, text: last.text + textChunk, isFinal };
                                    return [...prev.slice(0, -1), updatedEntry];
                                }
                                // Otherwise, finalize the previous entry and add a new one.
                                const finalizedPrev = prev.map((entry, index) => 
                                    (index === prev.length - 1 && !entry.isFinal) ? { ...entry, isFinal: true } : entry
                                );
                                const newEntry = { speaker, text: textChunk, isFinal };
                                return [...finalizedPrev, newEntry];
                            });
                        };
                        
                        const isTurnComplete = !!message.serverContent?.turnComplete;

                        if (message.serverContent?.inputTranscription) {
                            handleTranscription('user', message.serverContent.inputTranscription.text, isTurnComplete);
                        }
                        if (message.serverContent?.outputTranscription) {
                            handleTranscription('model', message.serverContent.outputTranscription.text, isTurnComplete);
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const audioContext = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, OUTPUT_SAMPLE_RATE, 1);
                            const source = audioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioContext.destination);
                            source.addEventListener('ended', () => {
                                playingAudioSourcesRef.current.delete(source);
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            playingAudioSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setConnectionState(ConnectionState.ERROR);
                        stopConversation();
                    },
                    onclose: (e: CloseEvent) => {
                        stopConversation();
                    },
                }
            });

        } catch (error) {
            console.error("Failed to start conversation:", error);
            setConnectionState(ConnectionState.ERROR);
        }
    }, [settings.systemPrompt, settings.voice, stopConversation, connectionState]);

    useEffect(() => {
        return () => {
            stopConversation();
        };
    }, [stopConversation]);

    return { connectionState, transcript, startConversation, stopConversation };
};