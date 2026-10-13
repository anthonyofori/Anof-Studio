import React, { useState, useRef } from 'react';
import {
  Mic,
  Square,
  Upload,
  Sparkles,
  Volume2,
  Loader2,
  Trash2,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { VoiceClonePersona } from '../types';

interface VoiceCloneStudioProps {
  savedClones: VoiceClonePersona[];
  onSaveClone: (clone: VoiceClonePersona) => void;
  onDeleteClone: (id: string) => void;
  onSelectAndUseClone: (clone: VoiceClonePersona) => void;
}

export const VoiceCloneStudio: React.FC<VoiceCloneStudioProps> = ({
  savedClones,
  onSaveClone,
  onDeleteClone,
  onSelectAndUseClone,
}) => {
  const [cloneName, setCloneName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [accent, setAccent] = useState('Neutral American English');
  const [vocalTraits, setVocalTraits] = useState(
    'Warm, conversational, slightly textured baritone with natural human pauses'
  );
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestingSpeech, setIsTestingSpeech] = useState(false);
  const [activeTestingId, setActiveTestingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Start Mic Recording
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Mic error:', err);
      setErrorMessage('Microphone permission denied. You can upload an audio file or configure vocal traits below.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAudioBase64(reader.result as string);
      if (!cloneName) {
        setCloneName(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateClone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/voice-clone/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioSampleBase64: audioBase64,
          voiceName: cloneName || (gender === 'male' ? 'Cloned Male Voice' : 'Cloned Female Voice'),
          gender,
          vocalTraits,
          accent,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create voice clone');
      }

      const resData = await response.json();
      if (resData.clonePersona) {
        const newClone: VoiceClonePersona = {
          ...resData.clonePersona,
          createdAt: new Date().toLocaleDateString(),
        };
        onSaveClone(newClone);
        setCloneName('');
        setAudioBase64(null);
      }
    } catch (err: any) {
      console.error('Clone error:', err);
      setErrorMessage(err.message || 'Failed to analyze and clone voice');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestCloneVoice = async (clone: VoiceClonePersona) => {
    setActiveTestingId(clone.id);
    setIsTestingSpeech(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hello! This is an authentic human voice cloned in Anof Studio. My name is ${clone.name}, and I am ready to narrate your scripts.`,
          voiceName: clone.recommendedBaseVoice,
          gender: clone.gender,
          isCloned: true,
          clonePersona: clone,
        }),
      });

      const data = await response.json();
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.play();
      }
    } catch (err: any) {
      console.error('Test audio error:', err);
    } finally {
      setIsTestingSpeech(false);
      setActiveTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Acoustic Biometric Engine</span>
            <span>·</span>
            <span>Formant &amp; Harmonics Matching</span>
            <span>·</span>
            <span className="text-amber-400 font-medium">Custom Voice Personas</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Voice Clone Studio
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Record a short sample or upload audio to clone any human voice with organic vocal cord resonance, custom timbre, and speech pacing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Clone Creation Form */}
        <div className="lg:col-span-7 bg-[#0f1117] border border-white/[0.08] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Create New Human Voice Clone</span>
          </h3>

          <form onSubmit={handleCreateClone} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Clone Identifier Name
              </label>
              <input
                type="text"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="e.g. Anthony (Authentic Narrator)"
                className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#08090c] border border-white/[0.08] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Gender Profile
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    gender === 'male'
                      ? 'bg-white/10 border-white/20 text-white font-semibold'
                      : 'bg-[#08090c] border-white/[0.06] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Male Human Voice
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    gender === 'female'
                      ? 'bg-white/10 border-white/20 text-white font-semibold'
                      : 'bg-[#08090c] border-white/[0.06] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Female Human Voice
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Accent / Delivery Cadence
              </label>
              <select
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="w-full text-xs px-3.5 py-2 rounded-lg bg-[#08090c] border border-white/[0.08] text-slate-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="Neutral American English">Neutral American English</option>
                <option value="Warm British English (RP)">Warm British English (RP)</option>
                <option value="Natural Canadian English">Natural Canadian English</option>
                <option value="Australian English">Australian English</option>
                <option value="Transatlantic Articulate">Transatlantic Articulate</option>
                <option value="French Native Accented English">French Native Accented English</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Vocal Timbre &amp; Human Resonance Description
              </label>
              <textarea
                value={vocalTraits}
                onChange={(e) => setVocalTraits(e.target.value)}
                rows={2}
                placeholder="Describe pitch, breathing texture, rasp, or warmth..."
                className="w-full text-xs p-3 rounded-lg bg-[#08090c] border border-white/[0.08] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/60 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">
                Acoustic Audio Sample (Optional but Recommended)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-[#08090c] border border-white/[0.06] flex flex-col items-center justify-center gap-2 text-center">
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold animate-pulse cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop Recording ({recordingSeconds}s)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-amber-300 text-xs font-medium cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Record Mic Sample</span>
                    </button>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {audioBase64 ? 'Sample captured' : 'Speak 5-10s into microphone'}
                  </span>
                </div>

                <label className="p-3.5 rounded-lg bg-[#08090c] border border-dashed border-white/[0.08] hover:border-amber-500/40 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-300 font-medium">Upload Audio File</span>
                  <span className="text-[10px] text-slate-500">WAV, MP3, or WebM</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing || !cloneName.trim()}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/15 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Acoustic Formants...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze &amp; Save Voice Clone</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Saved Clones Library */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">
            Saved Voice Clones ({savedClones.length})
          </h3>

          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {savedClones.map((clone) => {
              const isCurrentlyTesting = isTestingSpeech && activeTestingId === clone.id;
              return (
                <div
                  key={clone.id}
                  className="p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] hover:border-amber-500/30 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{clone.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="capitalize">{clone.gender} voice</span>
                        <span>·</span>
                        <span>{clone.accent}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteClone(clone.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Delete Clone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-[#08090c] p-2.5 rounded-lg border border-white/[0.04]">
                    {clone.timbre}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleTestCloneVoice(clone)}
                      disabled={isCurrentlyTesting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.06] transition cursor-pointer disabled:opacity-50"
                    >
                      {isCurrentlyTesting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Playing...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Test Voice</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onSelectAndUseClone(clone)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer text-center"
                    >
                      Use in Speech Studio
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
