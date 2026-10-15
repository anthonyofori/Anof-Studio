import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Video,
  Languages,
  Mic,
  Eye,
  Clapperboard,
  UserCheck,
  Sparkles,
  Download,
  RotateCcw,
  Cloud,
  CloudCheck,
  LogIn,
  LogOut,
  FolderOpen,
  Bookmark
} from 'lucide-react';
import { StudioMode, HumanVoice, VoiceClonePersona } from './types';
import {
  DEFAULT_ENGLISH_SCRIPT,
  REALISTIC_HUMAN_VOICES,
  DEFAULT_VOICE_CLONES,
} from './data/defaultData';
import { useAuth } from './firebase/authContext';
import {
  saveScriptToFirestore,
  subscribeUserScripts,
  saveVoiceCloneToFirestore,
  subscribeUserVoiceClones,
  deleteVoiceCloneFromFirestore,
  logSpeechGenerationToFirestore,
  SavedScriptDocument,
} from './firebase/firestoreService';
import { TextToSpeechStudio } from './components/TextToSpeechStudio';
import { LanguageConverterStudio } from './components/LanguageConverterStudio';
import { VoiceCloneStudio } from './components/VoiceCloneStudio';
import { TextToVideoStudio } from './components/TextToVideoStudio';
import { ImageToTextStudio } from './components/ImageToTextStudio';
import { ImageToVideoStudio } from './components/ImageToVideoStudio';

export default function App() {
  const { currentUser, signInWithGoogle, signOut } = useAuth();
  const [activeStudio, setActiveStudio] = useState<StudioMode>('tts');
  // Starts empty so page refresh starts clean with placeholders visible
  const [scriptText, setScriptText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<HumanVoice>(REALISTIC_HUMAN_VOICES[0]);
  const [selectedClone, setSelectedClone] = useState<VoiceClonePersona | null>(null);
  const [savedClones, setSavedClones] = useState<VoiceClonePersona[]>(DEFAULT_VOICE_CLONES);
  const [cloudScripts, setCloudScripts] = useState<SavedScriptDocument[]>([]);
  const [showSavedScriptsModal, setShowSavedScriptsModal] = useState<boolean>(false);
  const [videoPromptFromSpeech, setVideoPromptFromSpeech] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Subscribe to user Firestore voice clones when authenticated
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeClones = subscribeUserVoiceClones(currentUser.uid, (remoteClones) => {
      if (remoteClones.length > 0) {
        // Merge default presets with user remote clones
        const combined = [...remoteClones];
        DEFAULT_VOICE_CLONES.forEach((def) => {
          if (!combined.some((c) => c.id === def.id)) {
            combined.push(def);
          }
        });
        setSavedClones(combined);
      }
    });

    const unsubscribeScripts = subscribeUserScripts(currentUser.uid, (scripts) => {
      setCloudScripts(scripts);
    });

    return () => {
      unsubscribeClones();
      unsubscribeScripts();
    };
  }, [currentUser]);

  const handleSaveClone = async (newClone: VoiceClonePersona) => {
    setSavedClones((prev) => [newClone, ...prev]);
    setSelectedClone(newClone);

    if (currentUser) {
      try {
        await saveVoiceCloneToFirestore(currentUser.uid, newClone);
        showToast(`Voice Clone "${newClone.name}" saved to Firestore.`);
      } catch (e) {
        console.error(e);
      }
    } else {
      showToast(`Voice Clone "${newClone.name}" saved locally. Sign in to sync to Cloud.`);
    }

    setActiveStudio('tts');
  };

  const handleDeleteClone = async (id: string) => {
    setSavedClones((prev) => prev.filter((c) => c.id !== id));
    if (selectedClone?.id === id) {
      setSelectedClone(null);
    }

    if (currentUser) {
      try {
        await deleteVoiceCloneFromFirestore(currentUser.uid, id);
        showToast('Voice clone deleted from Firestore.');
      } catch (e) {
        console.error(e);
      }
    } else {
      showToast('Voice clone removed.');
    }
  };

  const handleSaveScriptToCloud = async () => {
    if (!currentUser) {
      showToast('Please sign in with Google to save scripts to Firestore.');
      try {
        await signInWithGoogle();
      } catch (e) {
        // user closed popup
      }
      return;
    }

    try {
      await saveScriptToFirestore(currentUser.uid, {
        title: scriptText.slice(0, 45) + '...',
        content: scriptText,
        language: 'English',
      });
      showToast('Script saved to Firebase Firestore!');
    } catch (err: any) {
      showToast('Failed to save script to cloud.');
    }
  };

  const handleSendToVideo = (prompt: string) => {
    setVideoPromptFromSpeech(prompt);
    setActiveStudio('text-to-video');
    showToast('Script sent to Text-to-Video Studio.');
  };

  const handleSendToSpeech = (text: string, language: string = 'English') => {
    setScriptText(text);
    setActiveStudio('tts');
    showToast(`Loaded ${language} text into Speech Studio.`);
  };

  const handleResetDefaults = () => {
    setScriptText(DEFAULT_ENGLISH_SCRIPT);
    setSelectedVoice(REALISTIC_HUMAN_VOICES[0]);
    setSelectedClone(null);
    showToast('Reset to default Miira-Coffee product presentation.');
  };

  const handleExportFullScript = () => {
    const blob = new Blob([scriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anof-studio-script.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Script file exported.');
  };

  return (
    <div className="min-h-screen bg-[#08090c] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-white/10 text-slate-100 text-xs font-medium shadow-2xl backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Modern Studio App Bar with Firebase Account */}
      <header className="border-b border-white/[0.07] bg-[#0c0d12]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
          {/* Logo & Brand: Anof Studio */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/15 ring-1 ring-white/20 shrink-0">
              A
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-lg text-white tracking-tight truncate">
                  Anof Studio
                </span>
                <span className="hidden xs:inline text-[11px] font-mono text-slate-500">·</span>
                <span className="hidden sm:inline text-xs text-slate-400 font-medium truncate">
                  Multimodal AI Suite
                </span>
                {currentUser && (
                  <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1 shrink-0 ml-1">
                    <Cloud className="w-3 h-3 text-amber-400" />
                    <span className="hidden md:inline">Firestore Active</span>
                  </span>
                )}
              </div>
              <p className="hidden md:flex text-[11px] text-slate-500 items-center gap-1.5">
                <span>Human Speech</span>
                <span>·</span>
                <span>Voice Clone</span>
                <span>·</span>
                <span>Global Translator</span>
                <span>·</span>
                <span>Veo Video</span>
              </p>
            </div>
          </div>

          {/* Active Voice Persona Status & Actions - Compact on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs">
              <span className="text-slate-400">Speaker:</span>
              {selectedClone ? (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  {selectedClone.name}
                </span>
              ) : (
                <span className="text-slate-200 font-medium">
                  {selectedVoice.name} ({selectedVoice.gender === 'male' ? 'Male' : 'Female'})
                </span>
              )}
            </div>

            {/* Cloud Save & Saved Scripts */}
            <button
              onClick={handleSaveScriptToCloud}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition flex items-center gap-1.5 cursor-pointer"
              title="Save current script to Firebase Firestore"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Save</span>
            </button>

            {currentUser && cloudScripts.length > 0 && (
              <button
                onClick={() => setShowSavedScriptsModal(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition flex items-center gap-1.5 cursor-pointer"
                title="View Saved Cloud Scripts"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Saved</span>
                <span>({cloudScripts.length})</span>
              </button>
            )}

            <button
              onClick={handleExportFullScript}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition flex items-center gap-1.5 cursor-pointer"
              title="Export Current Script"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Google Authentication Control */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-1 border-l border-white/[0.08]">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-white/20"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center font-bold">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.04] transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-sm transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Sign In</span>
              </button>
            )}

            <button
              onClick={handleResetDefaults}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition cursor-pointer"
              title="Reset to Miira-Coffee Default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Clean Studio Workflow Segmented Bar - Horizontal Scroll on Touch */}
        <div className="max-w-[1440px] mx-auto px-2 sm:px-6 lg:px-8 border-t border-white/[0.05] overflow-x-auto no-scrollbar py-1.5 scroll-smooth">
          <div className="flex items-center gap-1 min-w-max px-1">
            {[
              { id: 'tts', label: 'Speech Synthesis', icon: Volume2, count: 'Realistic Human' },
              { id: 'translator', label: 'Universal Translator', icon: Languages, count: 'EN ⇄ FR & Any' },
              { id: 'voice-clone', label: 'Voice Clone Studio', icon: Mic, count: `${savedClones.length} Clones` },
              { id: 'text-to-video', label: 'Text to Video', icon: Video, count: 'Veo 3.1' },
              { id: 'image-to-text', label: 'Vision & OCR', icon: Eye, count: 'Multimodal' },
              { id: 'image-to-video', label: 'Image to Video', icon: Clapperboard, count: 'Motion' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeStudio === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveStudio(tab.id as StudioMode)}
                  className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : 'text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Studio Canvas Workspace */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col">
        {activeStudio === 'tts' && (
          <TextToSpeechStudio
            scriptText={scriptText}
            onChangeScriptText={setScriptText}
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
            selectedClone={selectedClone}
            onSelectClone={setSelectedClone}
            savedClones={savedClones}
            onOpenVoiceCloneModal={() => setActiveStudio('voice-clone')}
            onSendToVideoStudio={handleSendToVideo}
            onOpenLanguageConverter={() => setActiveStudio('translator')}
            onSpeechGenerated={(record) => {
              if (currentUser) {
                logSpeechGenerationToFirestore(currentUser.uid, record).catch(console.error);
                showToast(`Audio track saved to Firestore (${record.language}).`);
              }
            }}
          />
        )}

        {activeStudio === 'translator' && (
          <LanguageConverterStudio
            onSendToSpeech={handleSendToSpeech}
            onSendToVideo={handleSendToVideo}
          />
        )}

        {activeStudio === 'voice-clone' && (
          <VoiceCloneStudio
            savedClones={savedClones}
            onSaveClone={handleSaveClone}
            onDeleteClone={handleDeleteClone}
            onSelectAndUseClone={(clone) => {
              setSelectedClone(clone);
              setActiveStudio('tts');
              showToast(`Using cloned voice: ${clone.name}`);
            }}
          />
        )}

        {activeStudio === 'text-to-video' && (
          <TextToVideoStudio initialPrompt={videoPromptFromSpeech} />
        )}

        {activeStudio === 'image-to-text' && (
          <ImageToTextStudio
            onSendToSpeech={handleSendToSpeech}
            onSendToVideo={handleSendToVideo}
          />
        )}

        {activeStudio === 'image-to-video' && <ImageToVideoStudio />}
      </main>

      {/* Saved Cloud Scripts Modal */}
      {showSavedScriptsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm text-white">Your Cloud Saved Scripts</h3>
              </div>
              <button
                onClick={() => setShowSavedScriptsModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {cloudScripts.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] hover:border-amber-500/40 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-white truncate">{doc.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{doc.content}</p>
                  </div>
                  <button
                    onClick={() => {
                      setScriptText(doc.content);
                      setShowSavedScriptsModal(false);
                      showToast('Loaded script from Firebase!');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 cursor-pointer"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clean Studio Footer with Firebase info */}
      <footer className="border-t border-white/[0.07] bg-[#0c0d12] py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Anof Studio</span>
            <span>·</span>
            <span className="text-slate-400">Production-Ready Multimodal AI Suite</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span>Firebase Firestore &amp; Auth (manifest-night-l9v0l)</span>
            <span>·</span>
            <span>Gemini 3.8 Flash TTS</span>
            <span>·</span>
            <span>Google Veo 3.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
