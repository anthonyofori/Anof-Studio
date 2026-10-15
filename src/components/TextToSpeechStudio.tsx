import React, { useState, useRef } from 'react';
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
  UserCheck,
  Globe,
  Sparkles,
  ArrowRight,
  Bookmark,
  FileAudio,
  Radio,
  FileUp,
  File,
  UploadCloud,
  Trash2
} from 'lucide-react';
import { HumanVoice, VoiceClonePersona, LanguageOption } from '../types';
import { REALISTIC_HUMAN_VOICES, SUPPORTED_LANGUAGES, DEFAULT_ENGLISH_SCRIPT } from '../data/defaultData';
import { downloadAudioFile, formatAudioSize, sanitizeAudioFilename } from '../utils/audioDownload';

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
  onSpeechGenerated?: (record: {
    title: string;
    textSnippet: string;
    voice: string;
    language: string;
    characters: number;
  }) => void;
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
  onSpeechGenerated,
}) => {
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'clones'>('all');
  const [targetSpeechLanguage, setTargetSpeechLanguage] = useState<string>('English');
  const [customLanguage, setCustomLanguage] = useState<string>('');
  const [showCustomLangInput, setShowCustomLangInput] = useState<boolean>(false);
  const [humanBreathEnabled, setHumanBreathEnabled] = useState(true);
  const [emotionalTone, setEmotionalTone] = useState<'warm' | 'conversational' | 'authoritative' | 'enthusiastic'>('warm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslatingQuick, setIsTranslatingQuick] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [wavSize, setWavSize] = useState<number | null>(null);
  const [mp3Size, setMp3Size] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState<'wav' | 'mp3' | null>(null);
  const [isConvertingMp3, setIsConvertingMp3] = useState<boolean>(false);
  const [activePlaybackFormat, setActivePlaybackFormat] = useState<'wav' | 'mp3'>('wav');
  const [audioLangLabel, setAudioLangLabel] = useState<string>('English');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isTxt = lowerName.endsWith('.txt') || file.type === 'text/plain';
    const isDocx = lowerName.endsWith('.docx');
    const isDoc = lowerName.endsWith('.doc');
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';

    if (!isTxt && !isDocx && !isDoc && !isPdf) {
      setErrorMessage('Please upload a TXT (.txt), PDF (.pdf), Word (.docx), or DOC (.doc) document.');
      return;
    }

    setIsExtractingDoc(true);
    setErrorMessage(null);
    try {
      if (isTxt) {
        const text = await file.text();
        onChangeScriptText(text.trim());
        setUploadedDocName(file.name);
        setSuccessNotice(`Loaded text from "${file.name}".`);
        setTimeout(() => setSuccessNotice(null), 3500);
        return;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/document/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Failed to extract text from ${file.name}`);
      }

      const data = await response.json();
      if (data.text) {
        onChangeScriptText(data.text);
        setUploadedDocName(file.name);
        setSuccessNotice(`Extracted ${data.words?.toLocaleString() || ''} words from "${file.name}".`);
        setTimeout(() => setSuccessNotice(null), 3500);
      }
    } catch (err: any) {
      console.error('File extraction error in Speech Studio:', err);
      setErrorMessage(err.message || 'Failed to extract text from document');
    } finally {
      setIsExtractingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activeLanguageName = showCustomLangInput && customLanguage.trim() ? customLanguage.trim() : targetSpeechLanguage;

  const filteredVoices = REALISTIC_HUMAN_VOICES.filter((voice) => {
    if (genderFilter === 'male') return voice.gender === 'male';
    if (genderFilter === 'female') return voice.gender === 'female';
    return true;
  });

  const handleSelectLanguage = (langName: string) => {
    setTargetSpeechLanguage(langName);
    setShowCustomLangInput(false);
    setSuccessNotice(`Target speech language set to ${langName}. You can translate the script or synthesize directly.`);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  const handleGenerateSpeech = async (autoTranslate: boolean = false) => {
    if (!scriptText.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const isCloned = Boolean(selectedClone);
      const voiceName = isCloned ? selectedClone!.recommendedBaseVoice : selectedVoice.baseModelVoice;
      const gender = isCloned ? selectedClone!.gender : selectedVoice.gender;

      const styleDescription = `Warm, completely natural human voice speaking in ${activeLanguageName}. Tone: ${emotionalTone}. Genuine human breathing nuances, organic speech micro-cadence, authentic throat acoustics, native ${activeLanguageName} phonetics, zero synthetic AI robotic stiffness.`;

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          voiceName,
          gender,
          language: activeLanguageName.toLowerCase(),
          targetLang: activeLanguageName,
          autoTranslate,
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
        const receivedWavUrl = resData.wavUrl || resData.audioUrl;
        const receivedMp3Url = resData.mp3Url || null;
        setAudioUrl(receivedWavUrl);
        setWavUrl(receivedWavUrl);
        setMp3Url(receivedMp3Url);
        setWavSize(resData.wavSize || null);
        setMp3Size(resData.mp3Size || null);
        setActivePlaybackFormat('wav');
        setAudioLangLabel(activeLanguageName);

        if (resData.translatedText && resData.translatedText !== scriptText) {
          onChangeScriptText(resData.translatedText);
        }

        if (audioRef.current) {
          audioRef.current.src = receivedWavUrl;
          audioRef.current.load();
        }

        if (onSpeechGenerated) {
          onSpeechGenerated({
            title: scriptText.slice(0, 40) + '...',
            textSnippet: (resData.translatedText || scriptText).slice(0, 200),
            voice: isCloned ? selectedClone!.name : `${selectedVoice.name} (${selectedVoice.gender})`,
            language: activeLanguageName,
            characters: resData.characters || scriptText.length,
          });
        }

        const sizeLabel = resData.mp3Size ? ` (WAV & MP3 available)` : '';
        setSuccessNotice(`Realistic ${activeLanguageName} audio generated successfully${sizeLabel}.`);
        setTimeout(() => setSuccessNotice(null), 3500);
      } else {
        throw new Error('No audio returned from server');
      }
    } catch (err: any) {
      console.error('Speech error:', err);
      let msg = err.message || 'Failed to synthesize speech';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
        else if (typeof parsed.error === 'string') msg = parsed.error;
      } catch {}
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        msg = 'The voice synthesis service is experiencing temporary high demand. Please try again in a few moments.';
      }
      setErrorMessage(msg);
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
        setShowCustomLangInput(false);
        setAudioUrl(null);
        setSuccessNotice(`Script translated into ${langName}. Click Convert to Speech to generate voice-over.`);
        setTimeout(() => setSuccessNotice(null), 4000);
      }
    } catch (err: any) {
      console.error('Quick translate error:', err);
      let msg = err.message || 'Translation failed';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
        else if (typeof parsed.error === 'string') msg = parsed.error;
      } catch {}
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        msg = 'The translation service is experiencing temporary high demand. Please try again in a few moments.';
      }
      setErrorMessage(msg);
    } finally {
      setIsTranslatingQuick(false);
    }
  };

  const handleDownload = async (format: 'wav' | 'mp3') => {
    if (!wavUrl && !mp3Url && !audioUrl) return;
    setIsDownloading(format);
    const speakerName = selectedClone ? selectedClone.name : selectedVoice.name;
    const filename = sanitizeAudioFilename('anof-voice', activeLanguageName, speakerName, format);
    try {
      await downloadAudioFile({
        wavUrl: wavUrl || audioUrl,
        mp3Url,
        format,
        filename,
        onConvertingStart: () => setIsConvertingMp3(true),
        onConvertingEnd: () => setIsConvertingMp3(false),
      });
      setSuccessNotice(`Downloaded ${format.toUpperCase()} audio (${filename}) successfully.`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage(err.message || `Failed to download ${format.toUpperCase()}`);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleSwitchPlaybackFormat = (format: 'wav' | 'mp3') => {
    setActivePlaybackFormat(format);
    const targetUrl = format === 'mp3' ? (mp3Url || audioUrl) : (wavUrl || audioUrl);
    if (audioRef.current && targetUrl) {
      const wasPlaying = isPlaying;
      const prevTime = currentTime;
      audioRef.current.src = targetUrl;
      audioRef.current.currentTime = prevTime;
      if (wasPlaying) {
        audioRef.current.play().catch(console.error);
      }
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

  const currentLangObj = SUPPORTED_LANGUAGES.find(
    (l) => l.name.toLowerCase() === activeLanguageName.toLowerCase()
  );

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
            Synthesize natural human speech with breathing dynamics, organic conversational pauses, and vocal cord resonance across male, female, and cloned voices in <strong>any global language</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenLanguageConverter && (
            <button
              onClick={onOpenLanguageConverter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer"
            >
              <Languages className="w-4 h-4 text-amber-400" />
              <span>Universal Translator</span>
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

      {/* TARGET LANGUAGE SELECTION SECTION (Explicit Multi-Language Options) */}
      <div className="p-4 rounded-2xl bg-[#0f1117] border border-amber-500/30 space-y-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Convert to Language:
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <span>{currentLangObj?.flag || '🌐'}</span>
                  <span>{activeLanguageName}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Choose the target language for Text-to-Speech narration and instant translation.
              </p>
            </div>
          </div>

          {/* Full Language Dropdown Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-400 hidden sm:inline">
              Select Language:
            </label>
            <select
              value={showCustomLangInput ? 'custom' : targetSpeechLanguage}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowCustomLangInput(true);
                } else {
                  handleSelectLanguage(e.target.value);
                }
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-xl bg-[#08090c] border border-white/[0.12] text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-inner"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.name}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
              <option value="custom">✏️ Other / Custom Language...</option>
            </select>
          </div>
        </div>

        {/* Quick Language Selection Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/[0.05]">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Popular:</span>
          {[
            { name: 'English', flag: '🇬🇧' },
            { name: 'French', flag: '🇫🇷' },
            { name: 'Spanish', flag: '🇪🇸' },
            { name: 'German', flag: '🇩🇪' },
            { name: 'Italian', flag: '🇮🇹' },
            { name: 'Portuguese', flag: '🇵🇹' },
            { name: 'Japanese', flag: '🇯🇵' },
            { name: 'Arabic', flag: '🇸🇦' },
            { name: 'Chinese', flag: '🇨🇳' },
            { name: 'Swahili', flag: '🇰🇪' },
            { name: 'Hindi', flag: '🇮🇳' },
          ].map((item) => {
            const isSelected = !showCustomLangInput && targetSpeechLanguage.toLowerCase() === item.name.toLowerCase();
            return (
              <button
                key={item.name}
                onClick={() => handleSelectLanguage(item.name)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                <span>{item.flag}</span>
                <span>{item.name}</span>
              </button>
            );
          })}

          <button
            onClick={() => setShowCustomLangInput(!showCustomLangInput)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
              showCustomLangInput
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border-white/[0.06]'
            }`}
          >
            + Other Language
          </button>
        </div>

        {/* Custom Language Input Field */}
        {showCustomLangInput && (
          <div className="p-3 rounded-xl bg-[#08090c] border border-amber-500/30 flex flex-wrap items-center gap-3">
            <span className="text-xs text-amber-300 font-medium">Enter Custom Language / Dialect:</span>
            <input
              type="text"
              placeholder="e.g. Haitian Creole, Tagalog, Polish, Latin American Spanish..."
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-[#0f1117] border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={() => {
                if (customLanguage.trim()) {
                  setTargetSpeechLanguage(customLanguage.trim());
                  setSuccessNotice(`Custom language "${customLanguage.trim()}" activated.`);
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Voice Selection Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Select Human Voice Persona:
            </span>
            {selectedClone ? (
              <span className="text-xs text-amber-400 font-medium">
                (Active: {selectedClone.name})
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                (Active: {selectedVoice.name} · {selectedVoice.gender === 'male' ? 'Male' : 'Female'})
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

      {/* Script Editor & Multi-Language Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Script Content:
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Target Voice Language:</span>
              <strong className="text-amber-400 font-bold">{activeLanguageName}</strong>
            </span>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Document Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtractingDoc}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-amber-300 text-xs font-medium cursor-pointer transition disabled:opacity-50"
              title="Upload TXT, PDF, Word (.docx), or DOC document"
            >
              {isExtractingDoc ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileUp className="w-3.5 h-3.5" />
              )}
              <span>Upload Doc</span>
            </button>

            {/* Load Sample Button */}
            <button
              onClick={() => {
                onChangeScriptText(DEFAULT_ENGLISH_SCRIPT);
                setUploadedDocName(null);
                setSuccessNotice('Loaded sample Miira-Coffee presentation script.');
                setTimeout(() => setSuccessNotice(null), 3500);
              }}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 cursor-pointer"
              title="Load Miira-Coffee product presentation"
            >
              <Sparkles className="w-3 h-3" />
              <span>Sample</span>
            </button>

            {/* Translate Script Button */}
            <button
              onClick={() => handleQuickTranslate(activeLanguageName)}
              disabled={isTranslatingQuick}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-pointer transition disabled:opacity-50"
              title={`Translate current text into ${activeLanguageName}`}
            >
              {isTranslatingQuick ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Languages className="w-3.5 h-3.5" />
              )}
              <span>Translate to {activeLanguageName}</span>
            </button>

            <button
              onClick={handleCopyScript}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {scriptText.trim() && (
              <button
                onClick={() => {
                  onChangeScriptText('');
                  setUploadedDocName(null);
                }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-300 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-pointer"
                title="Clear script"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}

            <button
              onClick={() => onSendToVideoStudio(scriptText)}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>Video</span>
            </button>
          </div>
        </div>

        {isTranslatingQuick && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Translating script to {activeLanguageName} with clinical and botanical precision...</span>
          </div>
        )}

        {successNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {uploadedDocName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <File className="w-3.5 h-3.5" />
            <span>Document loaded: <strong>{uploadedDocName}</strong></span>
          </div>
        )}

        {/* Text Area with Drag & Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.[0]) handleProcessFile(e.dataTransfer.files[0]);
          }}
          className={`relative rounded-xl transition ${isDragging ? 'ring-2 ring-amber-500' : ''}`}
        >
          {isDragging && (
            <div className="absolute inset-0 z-20 rounded-xl bg-slate-950/90 border-2 border-dashed border-amber-400 flex flex-col items-center justify-center p-4 text-center">
              <UploadCloud className="w-8 h-8 text-amber-400 animate-bounce mb-2" />
              <p className="text-xs font-bold text-white">Drop Document to Load Script</p>
              <p className="text-[11px] text-slate-400">Supports .txt, .pdf, .docx, .doc</p>
            </div>
          )}

          <textarea
            value={scriptText}
            onChange={(e) => onChangeScriptText(e.target.value)}
            rows={7}
            placeholder={`Enter script text in ${activeLanguageName}, English, French, or any other global language...\n\nOr drag & drop / upload a document (TXT, PDF, Word .docx, DOC) or tap "Sample" above.`}
            className="w-full p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] text-slate-200 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:border-amber-500/60 shadow-inner resize-y"
          />
        </div>

        {/* Human Nuance Tuning Bar & Synthesis Trigger Buttons - Mobile Responsive */}
        <div className="p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
                  className={`capitalize px-2.5 py-0.5 rounded text-[11px] transition cursor-pointer ${
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* 1-Step Translate & Speak Button */}
            <button
              onClick={() => handleGenerateSpeech(true)}
              disabled={isGenerating || !scriptText.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-amber-300 hover:text-amber-200 font-semibold text-xs border border-white/[0.1] transition cursor-pointer disabled:opacity-50"
              title={`Translate into ${activeLanguageName} and generate human speech in one step`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Translate &amp; Speak ({activeLanguageName})</span>
            </button>

            {/* Direct Speech Synthesis Button */}
            <button
              onClick={() => handleGenerateSpeech(false)}
              disabled={isGenerating || !scriptText.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/15 transition cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Synthesizing ({activeLanguageName})...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 shrink-0" />
                  <span>{audioUrl ? `Regenerate Audio (${activeLanguageName})` : `Convert Text to Speech (${activeLanguageName})`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Audio Player & Waveform Box */}
      {audioUrl && (
        <div className="p-5 rounded-xl bg-[#0f1117] border border-amber-500/30 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">
                    Human Voice Master Track
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {audioLangLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                    {activePlaybackFormat.toUpperCase()} Mode
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedClone ? `Clone: ${selectedClone.name}` : `Speaker: ${selectedVoice.name} · ${selectedVoice.gender}`}
                </span>
              </div>
            </div>

            {/* Dual Download Hub: WAV & MP3 */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              {/* Download WAV button */}
              <button
                onClick={() => handleDownload('wav')}
                disabled={isDownloading !== null}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                title="Download uncompressed 24kHz 16-bit Studio Master WAV"
              >
                {isDownloading === 'wav' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download WAV</span>
                {wavSize && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-950/20 font-mono font-medium">
                    {formatAudioSize(wavSize)}
                  </span>
                )}
              </button>

              {/* Download MP3 button */}
              <button
                onClick={() => handleDownload('mp3')}
                disabled={isDownloading !== null || isConvertingMp3}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold border border-white/20 transition shadow-sm cursor-pointer disabled:opacity-50"
                title="Download compressed 192kbps MP3 (Optimized for web, podcasts, and mobile sharing)"
              >
                {isDownloading === 'mp3' || isConvertingMp3 ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Download MP3</span>
                {mp3Size ? (
                  <span className="px-1.5 py-0.2 text-[10px] rounded bg-amber-500/20 text-amber-300 font-mono font-medium">
                    {formatAudioSize(mp3Size)}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 text-[10px] rounded bg-amber-500/20 text-amber-300 font-mono font-medium">
                    192k
                  </span>
                )}
              </button>
            </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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

            <div className="flex items-center gap-3">
              {/* Playback Format Switcher */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#08090c] border border-white/[0.06] text-xs font-mono">
                <span className="text-[10px] text-slate-500 px-1">Audition:</span>
                <button
                  onClick={() => handleSwitchPlaybackFormat('wav')}
                  className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                    activePlaybackFormat === 'wav'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="24kHz 16-bit PCM Linear WAV"
                >
                  WAV
                </button>
                <button
                  onClick={() => handleSwitchPlaybackFormat('mp3')}
                  disabled={!mp3Url}
                  className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                    activePlaybackFormat === 'mp3'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : mp3Url
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 opacity-50 cursor-not-allowed'
                  }`}
                  title="192kbps CBR MP3"
                >
                  MP3
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
        </div>
      )}
    </div>
  );
};
