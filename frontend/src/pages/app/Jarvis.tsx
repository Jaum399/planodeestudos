import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Mic, MicOff, Send, Bell, BellOff, Trash2, CheckCircle, Loader2, Radio, Map, Trophy, Zap, Wand2, BookOpen, X } from 'lucide-react';
import { jarvisApi, mindmapApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import type { JarvisMessage, JarvisReminder, MindMapData, NectarAction } from '../../types';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

type VoiceModel = 'tigas_core' | 'manus_ia' | 'manus_ia_pro' | 'aios' | 'aios_coach';
type VoicePreset = 'adaptive' | 'calm' | 'objective' | 'energetic';

const VOICE_MODEL_LABEL: Record<VoiceModel, string> = {
  tigas_core: 'Tigas Core',
  manus_ia: 'Manus IA',
  manus_ia_pro: 'Manus IA Pro',
  aios: 'AIOS',
  aios_coach: 'AIOS Coach',
};

const LANG_TO_SPEECH: Record<'pt' | 'en' | 'es' | 'ca', string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  ca: 'ca-ES',
};

function isMindMapData(value: unknown): value is MindMapData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<MindMapData>;
  return Array.isArray(data.nodes) && Array.isArray(data.edges) && Array.isArray(data.challenges);
}

export default function JarvisPage() {
  const { user } = useAuth();
  const { language, t } = usePreferences();
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [reminders, setReminders] = useState<JarvisReminder[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [showReminders, setShowReminders] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [voiceModel, setVoiceModel] = useState<VoiceModel>('tigas_core');
  const [voicePreset, setVoicePreset] = useState<VoicePreset>('adaptive');
  const [mapData, setMapData] = useState<MindMapData | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [nectarMode, setNectarMode] = useState(false);
  const [visionActions, setVisionActions] = useState<NectarAction[]>([]);
  const [showVision, setShowVision] = useState(false);
  const [transientHint, setTransientHint] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sendMessageRef = useRef<(text: string) => void>(() => {});
  const lastCommandRef = useRef<{ text: string; ts: number } | null>(null);

  const reportVoiceFeedback = useCallback(async (feedbackType: 'interrupted' | 'repeated_command' | 'toggled_off') => {
    try {
      await jarvisApi.voiceFeedback(feedbackType);
    } catch {
      // Feedback implícito nunca deve interromper a conversa.
    }
  }, []);

  const normalizeCommandText = useCallback((text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const smartSuggestions = useMemo(() => {
    const pendingCount = reminders.filter((r) => !r.done).length;
    const suggestions = [
      'Me dá um plano de revisão para hoje',
      'Quais são meus pontos fracos da semana?',
      'Crie 5 flashcards sobre o tema que estudei ontem',
      'Monte um ciclo de 45 minutos com pausas',
    ];

    if (pendingCount > 0) {
      suggestions.unshift('Mostre meus lembretes pendentes e priorize os de hoje');
    }

    if (nectarMode) {
      suggestions.unshift('Tenho prova sexta e trabalho terça; organiza minhas tarefas e lembretes');
    }

    return suggestions.slice(0, 5);
  }, [reminders, nectarMode]);

  const getVoicePresetOffsets = useCallback((preset: VoicePreset) => {
    if (preset === 'calm') return { rate: -0.06, pitch: -0.03 };
    if (preset === 'objective') return { rate: 0.02, pitch: -0.01 };
    if (preset === 'energetic') return { rate: 0.05, pitch: 0.05 };
    return { rate: 0, pitch: 0 };
  }, []);

  // ── Load Initial State ──────────────────────────────────────────────────────
  useEffect(() => {    mindmapApi.get().then(({ data }) => setMapData(isMindMapData(data) ? data : null)).catch(() => {});    jarvisApi.getState()
      .then(({ data }) => {
        setReminders(data.reminders || []);
        setVoiceModel((data.voiceModel as VoiceModel) || 'tigas_core');
        setVoicePreset((data.voicePreset as VoicePreset) || 'adaptive');
        const hist: JarvisMessage[] = data.history || [];
        if (hist.length === 0) {
          const greeting: JarvisMessage = {
            role: 'jarvis',
            content: `Online, ${user?.name?.split(' ')[0] || 'usuario'}. Sou o Tigas, seu assistente de estudos por voz e texto. Modelo atual: ${VOICE_MODEL_LABEL[(data.voiceModel as VoiceModel) || 'tigas_core']}. Pode falar ou digitar.`,
            timestamp: new Date().toISOString(),
          };
          setMessages([greeting]);
        } else {
          setMessages(hist);
        }
      })
      .catch(() => {
        setMessages([{
          role: 'jarvis',
            content: 'Tigas online. Como posso ajudar seus estudos hoje?',
          timestamp: new Date().toISOString(),
        }]);
      })
      .finally(() => setLoadingState(false));
  }, [user?.name]);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Text-to-Speech ──────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_TO_SPEECH[language];
    const baseRate = voiceModel === 'manus_ia' || voiceModel === 'manus_ia_pro' ? 1.08 : voiceModel === 'aios' || voiceModel === 'aios_coach' ? 0.96 : 1;
    const basePitch = voiceModel === 'manus_ia' || voiceModel === 'manus_ia_pro' ? 1.15 : voiceModel === 'aios' || voiceModel === 'aios_coach' ? 0.9 : 1;
    const presetOffsets = getVoicePresetOffsets(voicePreset);
    utterance.rate = Math.max(0.84, Math.min(1.16, baseRate + presetOffsets.rate));
    utterance.pitch = Math.max(0.84, Math.min(1.2, basePitch + presetOffsets.pitch));
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = LANG_TO_SPEECH[language].split('-')[0];
    const ptVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()) && v.name.toLowerCase().includes('google'))
      || voices.find(v => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()));
    if (ptVoice) utterance.voice = ptVoice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      if (conversationMode) {
        setTimeout(() => {
          if (!listening) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) return;
            const recognition = new SpeechRecognition();
            recognition.lang = LANG_TO_SPEECH[language];
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.onstart = () => setListening(true);
            recognition.onend = () => setListening(false);
            recognition.onerror = () => setListening(false);
            recognition.onresult = (e: SpeechRecognitionEvent) => {
              const transcript = e.results[0][0].transcript;
              sendMessageRef.current(transcript);
            };
            recognitionRef.current = recognition;
            recognition.start();
          }
        }, 350);
      }
    };
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [conversationMode, listening, voiceModel, voicePreset, language, getVoicePresetOffsets]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const normalized = normalizeCommandText(trimmed);
    const nowTs = Date.now();
    if (lastCommandRef.current && nowTs - lastCommandRef.current.ts <= 120000 && lastCommandRef.current.text === normalized) {
      reportVoiceFeedback('repeated_command');
      if (nowTs - lastCommandRef.current.ts <= 8000) {
        setTransientHint('Comando repetido muito rápido. Aguarde um instante ou reformule para melhorar a resposta.');
        window.setTimeout(() => setTransientHint(''), 2600);
        return;
      }
    }
    lastCommandRef.current = { text: normalized, ts: nowTs };

    const userMsg: JarvisMessage = { role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let data: any = null;
      let attempts = 0;

      while (!data && attempts < 2) {
        try {
          const response = await jarvisApi.chat(trimmed, { voiceModel, nectarMode });
          data = response.data;
        } catch (error: any) {
          attempts += 1;
          if (attempts >= 2 || error?.response?.status === 400) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 450));
        }
      }

      const jarvisMsg: JarvisMessage = { role: 'jarvis', content: data.reply, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, jarvisMsg]);
      speak(data.reply);

      if (data.sideEffect?.type === 'reminder_created') {
        setReminders(prev => [...prev, data.sideEffect.reminder]);
      }
      if (data.sideEffect?.type === 'mindmap_updated' && isMindMapData(data.sideEffect.map)) {
        setMapData(data.sideEffect.map);
        setShowMap(true);
        setShowReminders(false);
        setShowVision(false);
      }
      if (data.sideEffect?.type === 'nectar_actions') {
        if (data.sideEffect.reminders?.length > 0) {
          setReminders(prev => [...prev, ...data.sideEffect.reminders]);
        }
        if (data.actions?.length > 0) {
          setVisionActions(data.actions);
          setShowVision(true);
          setShowReminders(false);
          setShowMap(false);
        }
      }
    } catch {
      const errMsg: JarvisMessage = {
        role: 'jarvis',
        content: 'Houve um erro na comunicação. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading, speak, voiceModel, normalizeCommandText, reportVoiceFeedback]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    if (voicePreset === 'adaptive') return;
    jarvisApi.updateVoiceProfile(voicePreset).catch(() => {
      // Não bloquear UX se falhar persistência no backend.
    });
  }, [voicePreset]);

  // ── Voice Recognition ───────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Seu navegador não suporta reconhecimento de voz. Use o Chrome.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = LANG_TO_SPEECH[language];
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (_e: SpeechRecognitionErrorEvent) => setListening(false);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      sendMessage(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [listening, sendMessage, language]);

  // ── Reminders ───────────────────────────────────────────────────────────────
  const doneReminder = async (id: string) => {
    await jarvisApi.doneReminder(id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done: true } : r));
  };

  const deleteReminder = async (id: string) => {
    await jarvisApi.deleteReminder(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const pendingReminders = reminders.filter(r => !r.done);

  if (loadingState) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-cyan-400 text-sm">Inicializando Tigas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-app-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* JARVIS Arc Reactor */}
          <div className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${speaking ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]' : listening ? 'border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-cyan-600/60'}`}>
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${speaking ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : listening ? 'bg-red-400 animate-pulse' : 'bg-cyan-700'}`} />
            {speaking && (
              <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" />
            )}
          </div>
          <div>
            <h1 className="text-white font-bold">TIGAS</h1>
            <p className="text-xs text-cyan-500/70">
              {speaking ? t('tigas_speaking') : listening ? t('tigas_listening') : t('tigas_idle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={voiceModel}
            onChange={(e) => setVoiceModel(e.target.value as VoiceModel)}
            className="px-2.5 py-2 rounded-xl border border-app-border bg-app-card text-gray-300 text-xs md:text-sm focus:outline-none focus:border-cyan-500/40"
            title={t('ai_model')}
          >
            <option value="tigas_core">Tigas Core</option>
            <option value="manus_ia">Manus IA</option>
            <option value="manus_ia_pro">Manus IA Pro</option>
            <option value="aios">AIOS</option>
            <option value="aios_coach">AIOS Coach</option>
          </select>

          <button
            onClick={() => setConversationMode((prev) => !prev)}
            className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${conversationMode ? 'border-cyan-500/50 text-cyan-300 bg-cyan-500/10' : 'border-app-border text-gray-400 hover:text-white hover:bg-white/5'}`}
            title={t('conversation_mode')}
          >
            <Radio size={15} />
            {t('conversation_mode')}
          </button>

          <button
            onClick={() => { setNectarMode(prev => !prev); if (!nectarMode) { setShowVision(false); } }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs md:text-sm transition-colors ${
              nectarMode ? 'border-amber-500/50 text-amber-300 bg-amber-500/10' : 'border-app-border text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Modo Visão: detecta e cria tarefas, lembretes e concluóes automaticamente de uma mensagem"
          >
            <Wand2 size={15} />
            Modo Visão
          </button>

          <button
            onClick={() => { setShowMap(prev => !prev); setShowReminders(false); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs md:text-sm transition-colors ${showMap ? 'border-purple-500/50 text-purple-300 bg-purple-500/10' : 'border-app-border text-gray-400 hover:text-white hover:bg-white/5'}`}
            title={t('map')}
          >
            <Map size={15} />
            {t('map')}
          </button>

          <button
            onClick={() => { setShowReminders(prev => !prev); setShowMap(false); }}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl border border-app-border text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-xs md:text-sm"
          >
            {showReminders ? <BellOff size={15} /> : <Bell size={15} />}
            {t('reminders')}
            {pendingReminders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-600 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingReminders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'jarvis' && (
                  <div className="w-7 h-7 rounded-full border border-cyan-600/40 bg-cyan-950/40 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  </div>
                )}
                <div className={`max-w-[92%] md:max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary-600/30 border border-primary-500/30 text-white rounded-tr-sm'
                    : 'bg-app-card border border-cyan-500/20 text-gray-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border border-cyan-600/40 bg-cyan-950/40 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                </div>
                <div className="bg-app-card border border-cyan-500/20 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-500/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-500/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-500/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 md:px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-app-border">
            {transientHint && (
              <div className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {transientHint}
              </div>
            )}
            <div className="flex gap-2">
              {/* Voice button */}
              <button
                onClick={toggleVoice}
                className={`p-3 rounded-xl border transition-all ${
                  listening
                    ? 'border-red-500/60 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : 'border-app-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30'
                }`}
                title={listening ? 'Parar gravacao' : 'Falar com o Tigas'}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder={nectarMode ? 'Ex: preciso estudar cirurgia até sexta, me lembra de revisar cardiologia amanhã, completei fisiologia...' : t('tigas_placeholder')}
                className="flex-1 bg-app-card border border-app-border rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/40 transition-colors"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="p-3 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30 transition-colors disabled:opacity-40"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {smartSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-2 text-center">
              {nectarMode
                ? <span>Modo Visão ativo — <span className="text-amber-600/70">uma mensagem cria tarefas, lembretes e marca o mapa</span></span>
                : 'Diga: "me lembra de revisar amanha", "dica de estudo", "como esta meu progresso"'
              }
            </p>
          </div>
        </div>

        {/* Reminders Panel */}
        {showReminders && (
          <div className="fixed md:static inset-y-0 right-0 z-30 w-[85vw] max-w-72 border-l border-app-border bg-app-bg flex flex-col shadow-2xl md:shadow-none">
            <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
              <p className="text-white font-semibold text-sm">Lembretes ({pendingReminders.length})</p>
              <button onClick={() => setShowReminders(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
                <X size={13} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {pendingReminders.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Nenhum lembrete pendente</p>
              ) : (
                pendingReminders.map(r => (
                  <div key={r.id} className="bg-app-card border border-app-border rounded-xl p-3">
                    <p className="text-white text-sm mb-1">{r.text}</p>
                    <p className="text-gray-500 text-xs mb-2">
                      {new Date(r.due_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => doneReminder(r.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
                      >
                        <CheckCircle size={12} /> Concluído
                      </button>
                      <button
                        onClick={() => deleteReminder(r.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Vision Panel — Modo Visão */}
        {showVision && visionActions.length > 0 && (
          <div className="fixed md:static inset-y-0 right-0 z-30 w-[85vw] max-w-72 border-l border-app-border bg-app-bg flex flex-col shadow-2xl md:shadow-none">
            <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 size={14} className="text-amber-400" />
                <p className="text-white font-semibold text-sm">Visão Tigas</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  {visionActions.filter(a => a.created).length}/{visionActions.length} criados
                </span>
                <button onClick={() => setShowVision(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
                  <X size={13} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {visionActions.map((action, i) => {
                const styles: Record<string, { bg: string; border: string; text: string }> = {
                  task:       { bg: 'bg-blue-500/5',   border: 'border-blue-500/20',   text: 'text-blue-300' },
                  reminder:   { bg: 'bg-amber-500/5',  border: 'border-amber-500/20',  text: 'text-amber-300' },
                  completion: { bg: 'bg-green-500/5',  border: 'border-green-500/20',  text: 'text-green-300' },
                  flashcard:  { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-300' },
                };
                const labels: Record<string, string> = {
                  task: 'TAREFA', reminder: 'LEMBRETE', completion: 'CONCLUÍDO', flashcard: 'FLASHCARD',
                };
                const icons: Record<string, JSX.Element> = {
                  task:       <CheckCircle size={11} className="text-blue-400" />,
                  reminder:   <Bell size={11} className="text-amber-400" />,
                  completion: <Trophy size={11} className="text-green-400" />,
                  flashcard:  <BookOpen size={11} className="text-purple-400" />,
                };
                const s = styles[action.type] || styles.task;
                return (
                  <div key={i} className={`rounded-xl border p-3 ${s.bg} ${s.border}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {icons[action.type]}
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${s.text}`}>
                          {labels[action.type] || action.type}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        action.created ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {action.created ? '✓ criado' : '✗ erro'}
                      </span>
                    </div>
                    <p className="text-gray-200 text-xs font-medium leading-snug">
                      {action.quantity ? `${action.quantity}× ` : ''}{action.label}
                    </p>
                    {action.due && (
                      <p className="text-gray-500 text-[10px] mt-1">
                        {new Date(action.due).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-app-border">
              <p className="text-[10px] text-gray-600 leading-relaxed text-center">
                Tarefas criadas no <span className="text-gray-500">Planner</span>
                {visionActions.some(a => a.type === 'reminder') && <> • Lembretes nos <span className="text-gray-500">Alertas</span></>}
                {visionActions.some(a => a.type === 'completion') && <> • Progresso no <span className="text-gray-500">Mapa</span></>}
              </p>
            </div>
          </div>
        )}

        {/* Map Progress Panel */}
        {showMap && (
          <div className="fixed md:static inset-y-0 right-0 z-30 w-[85vw] max-w-72 border-l border-app-border bg-app-bg flex flex-col shadow-2xl md:shadow-none">
            <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
              <p className="text-white font-semibold text-sm">Mapa Mental</p>
              <div className="flex items-center gap-2">
                {mapData && (
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                    <Trophy size={11} /> {mapData.total_xp} XP
                  </span>
                )}
                <button onClick={() => setShowMap(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
                  <X size={13} />
                </button>
              </div>
            </div>
            {mapData ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Progress bar */}
                {(() => {
                  const comp = mapData.nodes.filter(n => n.completed).length;
                  const tot = mapData.nodes.length;
                  const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
                  return (
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Progresso</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-app-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Zap size={10} /> {comp}/{tot} nós</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Next Topics */}
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Próximos tópicos</p>
                  <div className="space-y-1">
                    {mapData.nodes
                      .filter(n => n.unlocked && !n.completed && n.type !== 'root')
                      .slice(0, 5)
                      .map(node => (
                        <div key={node.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-app-border">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${node.type === 'branch' ? 'bg-purple-400' : 'bg-indigo-400'}`} />
                          <span className="truncate text-xs text-gray-300">{node.label}</span>
                        </div>
                      ))}
                    {mapData.nodes.filter(n => n.unlocked && !n.completed && n.type !== 'root').length === 0 && (
                      <p className="text-gray-600 text-xs py-3 text-center">Todos os tópicos disponíveis concluídos!</p>
                    )}
                  </div>
                </div>

                {/* Active Challenges */}
                {mapData.challenges.filter(c => c.status === 'accepted').length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Desafios ativos</p>
                    <div className="space-y-2">
                      {mapData.challenges
                        .filter(c => c.status === 'accepted')
                        .slice(0, 2)
                        .map(c => (
                          <div key={c.id} className="px-2 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <p className="text-amber-300 text-xs font-medium">{c.title}</p>
                            <p className="text-gray-500 text-xs mt-0.5">+{c.xp_reward} XP</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-600 text-center leading-relaxed border-t border-app-border pt-3">
                  Diga <span className="text-gray-500">"completei [tópico]"</span> ou{' '}
                  <span className="text-gray-500">"o que estudar"</span> para o Tigas atualizar seu mapa
                </p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-gray-500 text-sm text-center">Nenhum mapa encontrado. Acesse a aba Mapa Mental para criar o seu.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
