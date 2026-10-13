import React, { useState } from 'react';
import {
  Volume2,
  Mic,
  Copy,
  Check,
  Download,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Loader2,
  Video,
  Languages,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { HumanVoice, VoiceClonePersona } from '../types';
import { REALISTIC_HUMAN_VOICES, SUPPORTED_LANGUAGES } from '../data/defaultData';

interface TextToSpeechStudioProps {
  scriptText: string;
  onChangeScriptText: (text: string) => void;
  selectedVoice: HumanVoice;
  onSelectVoice: (voice: HumanVoice) => void;
  selectedClone: VoiceClonePersona | null;
  onSelectClone: (clone: VoiceClonePersona | null) => void;
  savedClones: VoiceClonePersona[];
  onOpenVoiceCloneModal: () => void;
  onSendToVideoStudio: (text: string) => void;
  onOpenLanguageConverter?: () => void;
}

export const TextToSpeechStudio: React.FC<TextToSpeechStudioProps> = ({
  scriptText,
  onChangeScriptText,
  selectedVoice,
  onSelectVoice,
  selectedClone,
  onSelectClone,
  savedClones,
  onOpenVoiceCloneModal,
  onSendToVideoStudio,
  onOpenLanguageConverter,
}) => {
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'clones'>('all');
  const [targetSpeechLanguage, setTargetSpeechLanguage] = useState<string>('English');
  const [humanBreathEnabled, setHumanBreathEnabled] = useState(true);
  const [emotionalTone, setEmotionalTone] = useState<'conversational' | 'authoritative' | 'warm' | 'enthusiastic'>('warm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslatingQuick, setIsTranslatingQuick] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const filteredVoices = REALISTIC_HUMAN_VOICES.filter((voice) => {
    if (genderFilter === 'male') return voice.gender === 'male';
    if (genderFilter === 'female') return voice.gender === 'female';
    return true;
  });

  const handleGenerateSpeech = async () => {
    if (!scriptText.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const isCloned = Boolean(selectedClone);
      const voiceName = isCloned ? selectedClone!.recommendedBaseVoice : selectedVoice.baseModelVoice;
      const gender = isCloned ? selectedClone!.gender : selectedVoice.gender;

      const styleDescription = `Warm, completely natural human voice speaking in ${targetSpeechLanguage}. Tone: ${emotionalTone}. Genuine human breathing nuances, organic speech micro-cadence, authentic throat acoustics, native ${targetSpeechLanguage} phonetics, zero synthetic AI robotic stiffness.`;

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          voiceName,
          gender,
          language: targetSpeechLanguage.toLowerCase(),
          targetLang: targetSpeechLanguage,
          style: styleDescription,
          isCloned,
          clonePersona: selectedClone,
          realisticOptions: {
            addBreaths: humanBreathEnabled,
            emotionalWarmth: emotionalTone,
            cadence: 'organic',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Speech synthesis failed (${response.status})`);
      }

      const resData = await response.json();
      if (resData.audioUrl) {
        setAudioUrl(resData.audioUrl);
        if (audioRef.current) {
          audioRef.current.src = resData.audioUrl;
          audioRef.current.load();
        }
      } else {
        throw new Error('No audio returned from server');
      }
    } catch (err: any) {
      console.error('Speech error:', err);
      setErrorMessage(err.message || 'Failed to synthesize speech');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickTranslate = async (langName: string) => {
    if (!scriptText.trim()) return;
    setIsTranslatingQuick(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          sourceLang: 'auto',
          targetLang: langName,
          tone: emotionalTone,
        }),
      });
      const data = await response.json();
      if (data.translatedText) {
        onChangeScriptText(data.translatedText);
        setTargetSpeechLanguage(langName);
        setAudioUrl(null);
      }
    } catch (err: any) {
      console.error('Quick translate error:', err);
      setErrorMessage(err.message || 'Translation failed');
    } finally {
      setIsTranslatingQuick(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      {/* Studio Header Card */}
      <div className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Realistic Voice Engine</span>
            <span>·</span>
            <span>Gemini 3.8 Flash TTS</span>
            <span>·</span>
            <span className="text-amber-400 font-medium">Studio Master 24kHz</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Human Speech Synthesis &amp; Voice Modeling
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Synthesize natural human speech with breathing dynamics, organic conversational pauses, and vocal cord resonance across male, female, and cloned voices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenLanguageConverter && (
            <button
              onClick={onOpenLanguageConverter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer"
            >
              <Languages className="w-4 h-4 text-amber-400" />
              <span>Translate Script</span>
            </button>
          )}

          <button
            onClick={onOpenVoiceCloneModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/15 transition cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Create Voice Clone</span>
          </button>
        </div>
      </div>

      {/* Voice Selection Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Select Human Voice Persona:
            </span>
            {selectedClone && (
              <span className="text-xs text-amber-400 font-medium">
                (Active: {selectedClone.name})
              </span>
            )}
          </div>

          {/* Segmented Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0c0d12] border border-white/[0.06] text-xs">
            <button
              onClick={() => { setGenderFilter('all'); onSelectClone(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                genderFilter === 'all' && !selectedClone
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Voices
            </button>
            <button
              onClick={() => { setGenderFilter('male'); onSelectClone(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                genderFilter === 'male' && !selectedClone
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Male
            </button>
            <button
              onClick={() => { setGenderFilter('female'); onSelectClone(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                genderFilter === 'female' && !selectedClone
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Female
            </button>
            {savedClones.length > 0 && (
              <button
                onClick={() => setGenderFilter('clones')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  genderFilter === 'clones' || selectedClone
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cloned ({savedClones.length})
              </button>
            )}
          </div>
        </div>

        {/* Voice Persona Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {genderFilter === 'clones' ? (
            savedClones.map((clone) => {
              const isSelected = selectedClone?.id === clone.id;
              return (
                <button
                  key={clone.id}
                  onClick={() => onSelectClone(clone)}
                  className={`p-4 rounded-xl text-left border transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/[0.08] border-amber-500/60 ring-1 ring-amber-500/20'
                      : 'bg-[#0f1117] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-white">{clone.name}</span>
                    <span className="text-[11px] font-mono text-amber-400">Cloned</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                    {clone.timbre}
                  </p>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{clone.accent}</span>
                    <span className="capitalize">{clone.gender} voice</span>
                  </div>
                </button>
              );
            })
          ) : (
            filteredVoices.map((voice) => {
              const isSelected = !selectedClone && selectedVoice.id === voice.id;
              return (
                <button
                  key={voice.id}
                  onClick={() => {
                    onSelectVoice(voice);
                    onSelectClone(null);
                  }}
                  className={`p-4 rounded-xl text-left border transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/[0.08] border-amber-500/60 ring-1 ring-amber-500/20'
                      : 'bg-[#0f1117] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{voice.name}</span>
                      <span className="text-[11px] text-slate-400">
                        {voice.gender === 'male' ? 'Male' : 'Female'}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-400/90 font-medium">
                      {voice.ageGroup}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                    {voice.timbreDescription}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {voice.humanTraits.map((trait, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.04]"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Script Editor & Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Script Content:
            </span>
            <span className="text-xs text-slate-500">
              Current Language: <strong className="text-slate-300">{targetSpeechLanguage}</strong>
            </span>
          </div>

          {/* Quick Convert Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Convert to:</span>
            <button
              onClick={() => handleQuickTranslate('French')}
              disabled={isTranslatingQuick}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium cursor-pointer transition"
            >
              French (Français)
            </button>
            <button
              onClick={() => handleQuickTranslate('English')}
              disabled={isTranslatingQuick}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium cursor-pointer transition"
            >
              English
            </button>
            <button
              onClick={() => handleQuickTranslate('Spanish')}
              disabled={isTranslatingQuick}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium cursor-pointer transition"
            >
              Spanish (Español)
            </button>
            <button
              onClick={() => handleQuickTranslate('German')}
              disabled={isTranslatingQuick}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium cursor-pointer transition"
            >
              German (Deutsch)
            </button>

            <button
              onClick={handleCopyScript}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-pointer ml-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => onSendToVideoStudio(scriptText)}
              className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Send to Video</span>
            </button>
          </div>
        </div>

        {isTranslatingQuick && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Translating script to {targetSpeechLanguage}...</span>
          </div>
        )}

        <textarea
          value={scriptText}
          onChange={(e) => onChangeScriptText(e.target.value)}
          rows={7}
          placeholder="Enter script text in English, French, or any other language..."
          className="w-full p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-amber-500/60 shadow-inner resize-y"
        />

        {/* Human Nuance Tuning Bar */}
        <div className="p-3.5 rounded-xl bg-[#0f1117] border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={humanBreathEnabled}
                onChange={(e) => setHumanBreathEnabled(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span>Natural Breathing Pauses (&lt;breath&gt;)</span>
            </label>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Cadence:</span>
              {(['warm', 'conversational', 'authoritative', 'enthusiastic'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setEmotionalTone(tone)}
                  className={`capitalize px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                    emotionalTone === tone
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateSpeech}
            disabled={isGenerating || !scriptText.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/15 transition cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Human Voice...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>{audioUrl ? `Regenerate Audio (${targetSpeechLanguage})` : `Convert Text to Speech (${targetSpeechLanguage})`}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Audio Player & Waveform Box */}
      {audioUrl && (
        <div className="p-5 rounded-xl bg-[#0f1117] border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h4 className="text-sm font-semibold text-white">
                Human Voice Master Track ({targetSpeechLanguage})
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {selectedClone ? selectedClone.name : `${selectedVoice.name} · ${selectedVoice.gender}`}
              </span>
            </div>

            <a
              href={audioUrl}
              download={`anof-voice-${targetSpeechLanguage.toLowerCase()}.wav`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 text-xs font-medium border border-white/[0.08] transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download WAV</span>
            </a>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="h-10 flex items-center justify-center gap-1 px-3 bg-[#08090c] rounded-lg border border-white/[0.05] overflow-hidden">
            {Array.from({ length: 44 }).map((_, i) => {
              const progress = duration > 0 ? currentTime / duration : 0;
              const barPos = i / 44;
              const isPlayed = barPos <= progress;
              const heightMultiplier = Math.sin((i / 44) * Math.PI) * 0.7 + 0.3;
              const animHeight = isPlaying
                ? Math.max(15, Math.sin(i * 0.6 + currentTime * 6) * 100 * heightMultiplier)
                : Math.max(15, heightMultiplier * 45);

              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isPlayed ? 'bg-amber-400' : 'bg-slate-800'
                  }`}
                  style={{
                    height: `${animHeight}%`,
                    opacity: isPlayed ? 1 : 0.3,
                  }}
                />
              );
            })}
          </div>

          {/* Scrubber */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-xs font-mono tabular-nums text-slate-500">
              <span>{formatSeconds(currentTime)}</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    setCurrentTime(0);
                  }
                }}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 cursor-pointer"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer shadow-md shadow-amber-500/20"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
            </div>

            {/* Playback speed */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#08090c] border border-white/[0.06] text-xs font-mono">
              <span className="text-[10px] text-slate-500 px-1">Speed</span>
              {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (audioRef.current) audioRef.current.playbackRate = rate;
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                    playbackRate === rate ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
