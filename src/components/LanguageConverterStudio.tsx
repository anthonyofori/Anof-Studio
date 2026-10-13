import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Languages,
  Sparkles,
  Copy,
  Check,
  Volume2,
  Video,
  Loader2,
  Download
} from 'lucide-react';
import { LanguageOption, UniversalTranslationResult } from '../types';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_ENGLISH_SCRIPT,
  DEFAULT_FRENCH_SCRIPT,
} from '../data/defaultData';

interface LanguageConverterStudioProps {
  onSendToSpeech: (text: string, language: string) => void;
  onSendToVideo: (prompt: string) => void;
}

export const LanguageConverterStudio: React.FC<LanguageConverterStudioProps> = ({
  onSendToSpeech,
  onSendToVideo,
}) => {
  const [sourceLang, setSourceLang] = useState<string>('English');
  const [targetLang, setTargetLang] = useState<string>('French');
  const [inputText, setInputText] = useState<string>(DEFAULT_ENGLISH_SCRIPT);
  const [tone, setTone] = useState<string>('natural');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [result, setResult] = useState<UniversalTranslationResult | null>({
    sourceLang: 'English',
    targetLang: 'French',
    originalText: DEFAULT_ENGLISH_SCRIPT,
    translatedText: DEFAULT_FRENCH_SCRIPT,
    title: 'Miira-Coffee : Café Arabica Décaféiné & Bienfaits Thérapeutiques',
    sentencePairs: [
      {
        source: 'The next product we want to look at is Miira-Coffee.',
        target: 'Le prochain produit que nous souhaitons découvrir est le Miira-Coffee.',
      },
      {
        source: "This is our decaffeinated Arabica coffee, meaning that it's decaffeinated.",
        target: "Il s'agit de notre café Arabica décaféiné, ce qui signifie qu'il est sans caféine.",
      },
      {
        source: 'About 90 to 95 percent of the caffeine here is removed.',
        target: "La caféine a été éliminée à hauteur d'environ 90 à 95 %.",
      },
      {
        source: 'And aside removing the number of caffeine here, a certain active composition have been added, that are very beneficial to our health.',
        target: "Et au-delà du retrait de la caféine, des principes actifs très bénéfiques pour notre santé ont été ajoutés.",
      },
      {
        source: 'All you need is hot water. One sachet first thing in the morning.',
        target: "Tout ce dont vous avez besoin, c'est d'un peu d'eau chaude. Un seul sachet dès le réveil le matin.",
      },
      {
        source: "You consume one sachet of Miira Coffee and you're good to go. Your day will be good.",
        target: "Prenez un sachet de Miira-Coffee et vous voilà paré pour la journée. Votre journée sera excellente.",
      },
    ],
    vocabulary: [
      {
        sourceTerm: 'Decaffeinated Arabica coffee',
        targetTerm: 'Café Arabica décaféiné',
        explanation: 'Café de haute qualité dont la quasi-totalité de la caféine a été extraite.',
      },
      {
        sourceTerm: 'Mangosteen skin extract (xanthones)',
        targetTerm: "Extrait d'écorce de mangoustan (xanthones)",
        explanation: 'Polyphénols végétaux aux puissantes propriétés antioxydantes.',
      },
      {
        sourceTerm: 'Black seed powder',
        targetTerm: 'Poudre de nigelle (graine noire)',
        explanation: 'Plante médicinale régulant la glycémie et la tension artérielle.',
      },
      {
        sourceTerm: 'Fingerroot extract',
        targetTerm: 'Extrait de gingembre clé (racine de doigt)',
        explanation: 'Rhizome médicinal protecteur et anti-inflammatoire.',
      },
    ],
    pronunciationNotes:
      'Diction fluide, posée et chaleureuse. Prononciation française soignée avec intonation naturelle.',
  });

  const [activeTab, setActiveTab] = useState<'text' | 'aligned' | 'glossary'>('text');
  const [copied, setCopied] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    setSourceLang(prevTarget);
    setTargetLang(prevSource);

    if (result) {
      setInputText(result.translatedText);
      setResult({
        ...result,
        sourceLang: prevTarget,
        targetLang: prevSource,
        originalText: result.translatedText,
        translatedText: result.originalText,
      });
    }
  };

  const applyPreset = (src: string, tgt: string) => {
    setSourceLang(src);
    setTargetLang(tgt);
    if (src === 'French' && tgt === 'English') {
      setInputText(DEFAULT_FRENCH_SCRIPT);
    } else if (src === 'English' && tgt === 'French') {
      setInputText(DEFAULT_ENGLISH_SCRIPT);
    }
  };

  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setIsTranslating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          sourceLang,
          targetLang,
          tone,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to translate text');
      }

      const data = await response.json();
      setResult({
        sourceLang: data.detectedSourceLang || sourceLang,
        targetLang: data.targetLang || targetLang,
        originalText: inputText,
        translatedText: data.translatedText,
        title: data.title || `${sourceLang} to ${targetLang} Translation`,
        sentencePairs: data.sentencePairs || [],
        vocabulary: data.vocabulary || [],
        pronunciationNotes: data.pronunciationNotes,
      });
    } catch (err: any) {
      console.error('Translation error:', err);
      setErrorMessage(err.message || 'Error occurred during translation');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Universal Language Engine</span>
            <span>·</span>
            <span>Gemini 3.8 Flash Multilingual</span>
            <span>·</span>
            <span className="text-amber-400 font-medium">Bi-Directional Any Language</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Universal Language Converter
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Translate documents and scripts accurately between <strong>English ⇄ French</strong>, <strong>Spanish</strong>, <strong>German</strong>, <strong>Japanese</strong>, <strong>Arabic</strong>, or any global language with structured vocabulary extraction and immediate voice synthesis.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => applyPreset('English', 'French')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              sourceLang === 'English' && targetLang === 'French'
                ? 'bg-amber-500 text-slate-950 font-semibold border-amber-500'
                : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            English ➔ French
          </button>
          <button
            onClick={() => applyPreset('French', 'English')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              sourceLang === 'French' && targetLang === 'English'
                ? 'bg-amber-500 text-slate-950 font-semibold border-amber-500'
                : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            French ➔ English
          </button>
          <button
            onClick={() => applyPreset('English', 'Spanish')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] cursor-pointer"
          >
            English ➔ Spanish
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Converter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Source Text Column */}
        <div className="lg:col-span-6 space-y-3 flex flex-col">
          {/* Language Selector Header */}
          <div className="flex items-center justify-between bg-[#0f1117] p-3 rounded-xl border border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Source:</span>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#08090c] border border-white/[0.08] text-amber-300 focus:outline-none focus:border-amber-500/60"
              >
                <option value="Auto-Detect">Auto-Detect</option>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.name}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwapLanguages}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-amber-400 border border-white/[0.08] transition cursor-pointer"
              title="Swap Languages"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Target:</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#08090c] border border-white/[0.08] text-amber-300 focus:outline-none focus:border-amber-500/60"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.name}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Text Area */}
          <div className="flex-1 flex flex-col space-y-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={11}
              placeholder={`Enter text in ${sourceLang} to translate...`}
              className="w-full flex-1 p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-amber-500/60 resize-y shadow-inner"
            />

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0f1117] border border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Tone:</span>
                {(['natural', 'medical', 'commercial', 'casual'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`capitalize px-2.5 py-0.5 rounded text-[11px] transition cursor-pointer ${
                      tone === t
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleTranslate()}
                disabled={isTranslating || !inputText.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/15 transition cursor-pointer disabled:opacity-50"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Translating to {targetLang}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Convert to {targetLang}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Target Translation Output Column */}
        <div className="lg:col-span-6 space-y-3 flex flex-col">
          {/* Result Header & Tabs */}
          <div className="flex items-center justify-between bg-[#0f1117] px-3 py-2.5 rounded-xl border border-white/[0.08]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeTab === 'text'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {targetLang} Text
              </button>
              <button
                onClick={() => setActiveTab('aligned')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeTab === 'aligned'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setActiveTab('glossary')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeTab === 'glossary'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Glossary ({result?.vocabulary.length || 0})
              </button>
            </div>

            {result && (
              <button
                onClick={() => handleCopy(result.translatedText, 'translated')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] cursor-pointer"
              >
                {copied === 'translated' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied === 'translated' ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          {/* Result Content */}
          <div className="flex-1 bg-[#0f1117] rounded-xl border border-white/[0.08] p-4 overflow-y-auto max-h-[500px]">
            {result ? (
              <>
                {activeTab === 'text' && (
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-white/[0.06]">
                      <span className="text-[10px] font-mono text-amber-400 uppercase">
                        {targetLang} Title
                      </span>
                      <h3 className="text-base font-semibold text-white mt-0.5">
                        {result.title}
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {result.translatedText}
                    </div>

                    {result.pronunciationNotes && (
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300">
                        <span className="font-semibold text-slate-200 block mb-0.5">Vocal Guidance:</span>
                        {result.pronunciationNotes}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'aligned' && (
                  <div className="space-y-2.5">
                    {result.sentencePairs.map((pair, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-[#08090c] border border-white/[0.04] space-y-1.5"
                      >
                        <div className="text-[10px] text-slate-500 font-mono">
                          Sentence #{idx + 1}
                        </div>
                        <p className="text-xs text-slate-400 leading-snug">
                          {pair.source}
                        </p>
                        <p className="text-xs text-amber-200 leading-snug font-medium pt-1 border-t border-white/[0.04]">
                          {pair.target}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'glossary' && (
                  <div className="space-y-2">
                    {result.vocabulary.map((vocab, vIdx) => (
                      <div
                        key={vIdx}
                        className="p-3 rounded-lg bg-[#08090c] border border-white/[0.04] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-300">
                            {vocab.targetTerm}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {vocab.sourceTerm}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {vocab.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                Click &quot;Convert to {targetLang}&quot; to translate
              </div>
            )}
          </div>

          {/* Action Toolbar to Send Translated Text to Speech or Video */}
          {result && (
            <div className="p-3 rounded-xl bg-[#0f1117] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Production actions:
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSendToSpeech(result.translatedText, targetLang)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Speak in {targetLang}</span>
                </button>

                <button
                  onClick={() => onSendToVideo(result.translatedText)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.08] transition cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>Send to Video</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
