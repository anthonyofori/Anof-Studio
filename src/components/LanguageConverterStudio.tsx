import React, { useState, useRef } from 'react';
import {
  ArrowLeftRight,
  Languages,
  Sparkles,
  Copy,
  Check,
  Volume2,
  Video,
  Loader2,
  Download,
  Play,
  Pause,
  RotateCcw,
  FileText,
  UploadCloud,
  FileUp,
  File,
  X,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { LanguageOption, UniversalTranslationResult } from '../types';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_ENGLISH_SCRIPT,
  DEFAULT_FRENCH_SCRIPT,
} from '../data/defaultData';
import { downloadAudioFile, formatAudioSize, sanitizeAudioFilename } from '../utils/audioDownload';
import { generateTranslationDocxBlob, downloadWordDocument } from '../utils/wordExport';

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
  // Starts empty so that placeholder is shown and page refresh clears input
  const [inputText, setInputText] = useState<string>('');
  const [tone, setTone] = useState<string>('natural');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // File Drag-and-Drop and Upload state (.txt, .pdf, .doc, .docx)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isExtractingDoc, setIsExtractingDoc] = useState<boolean>(false);
  const [uploadedDocInfo, setUploadedDocInfo] = useState<{
    name: string;
    size: number;
    words?: number;
  } | null>(null);

  // Audio synthesis state (Dual WAV & MP3)
  const [inlineAudioUrl, setInlineAudioUrl] = useState<string | null>(null);
  const [inlineMp3Url, setInlineMp3Url] = useState<string | null>(null);
  const [inlineWavSize, setInlineWavSize] = useState<number | null>(null);
  const [inlineMp3Size, setInlineMp3Size] = useState<number | null>(null);
  const [isGeneratingInlineSpeech, setIsGeneratingInlineSpeech] = useState<boolean>(false);
  const [isDownloadingInline, setIsDownloadingInline] = useState<'wav' | 'mp3' | null>(null);
  const [isPlayingInline, setIsPlayingInline] = useState<boolean>(false);
  const inlineAudioRef = useRef<HTMLAudioElement | null>(null);

  // Word (.docx) export state
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);
  const [wordExportMode, setWordExportMode] = useState<'full' | 'translated-only'>('full');

  // Translation result starts null so refreshing clears everything
  const [result, setResult] = useState<UniversalTranslationResult | null>(null);

  const [activeTab, setActiveTab] = useState<'text' | 'aligned' | 'glossary'>('text');
  const [copied, setCopied] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

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
      // Clear audio on swap
      setInlineAudioUrl(null);
      setInlineMp3Url(null);
    }
  };

  const applyPreset = (src: string, tgt: string) => {
    setSourceLang(src);
    setTargetLang(tgt);
  };

  const handleLoadSampleText = () => {
    setSourceLang('English');
    setTargetLang('French');
    setInputText(DEFAULT_ENGLISH_SCRIPT);
    setUploadedDocInfo(null);
    setErrorMessage(null);
    showSuccess('Sample Miira-Coffee product presentation loaded.');
  };

  const handleClearAll = () => {
    setInputText('');
    setResult(null);
    setUploadedDocInfo(null);
    setInlineAudioUrl(null);
    setInlineMp3Url(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showSuccess('Content cleared.');
  };

  // --- Document Drag-and-Drop & File Upload Handling (.txt, .pdf, .doc, .docx) ---
  const handleProcessFile = async (file: File) => {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isTxt = lowerName.endsWith('.txt') || file.type === 'text/plain';
    const isDocx = lowerName.endsWith('.docx');
    const isDoc = lowerName.endsWith('.doc');
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';

    if (!isTxt && !isDocx && !isDoc && !isPdf) {
      setErrorMessage(
        'Unsupported file format. Please upload a TXT (.txt), PDF (.pdf), Word (.docx), or DOC (.doc) document.'
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25MB limit. Please upload a smaller document.');
      return;
    }

    setIsExtractingDoc(true);
    setErrorMessage(null);

    try {
      // 1. Direct client-side reading for plain text files
      if (isTxt) {
        const text = await file.text();
        if (!text.trim()) {
          throw new Error('The text file appears to be empty.');
        }
        setInputText(text.trim());
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        setUploadedDocInfo({ name: file.name, size: file.size, words });
        showSuccess(`Loaded "${file.name}" (${words.toLocaleString()} words).`);
        return;
      }

      // 2. Client-to-server extraction for PDF, DOC, and DOCX
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(new Error('Failed to read file into memory'));
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
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to extract text from ${file.name}`);
      }

      const data = await response.json();
      if (!data.text || !data.text.trim()) {
        throw new Error(`No readable text could be extracted from "${file.name}".`);
      }

      setInputText(data.text.trim());
      setUploadedDocInfo({
        name: file.name,
        size: file.size,
        words: data.words,
      });
      showSuccess(`Extracted ${data.words.toLocaleString()} words from "${file.name}".`);
    } catch (err: any) {
      console.error('File extraction error:', err);
      setErrorMessage(err.message || 'Failed to process document file.');
    } finally {
      setIsExtractingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // --- Translation API Trigger ---
  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setIsTranslating(true);
    setErrorMessage(null);
    setInlineAudioUrl(null);
    setInlineMp3Url(null);

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
      showSuccess(`Translation to ${targetLang} completed successfully!`);
    } catch (err: any) {
      console.error('Translation error:', err);
      let msg = err.message || 'Error occurred during translation';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
        else if (typeof parsed.error === 'string') msg = parsed.error;
      } catch {}
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        msg = 'The language translation service is experiencing temporary high demand. Please try again in a few moments.';
      }
      setErrorMessage(msg);
    } finally {
      setIsTranslating(false);
    }
  };

  // --- Word Document (.docx) Export ---
  const handleDownloadWord = async (mode: 'full' | 'translated-only' = 'full') => {
    if (!result) return;
    setIsExportingWord(true);
    try {
      const safeTitle = (result.title || 'translation')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .slice(0, 35);
      const filename = `anof-${result.sourceLang.toLowerCase()}-to-${result.targetLang.toLowerCase()}-${safeTitle}.docx`;

      const docxBlob = await generateTranslationDocxBlob(result, { mode });
      downloadWordDocument(docxBlob, filename);
      showSuccess(`Word document (${filename}) downloaded successfully!`);
    } catch (wordErr: any) {
      console.error('Word export error:', wordErr);
      setErrorMessage(wordErr.message || 'Failed to generate Word document.');
    } finally {
      setIsExportingWord(false);
    }
  };

  // --- Audio Synthesis (Dual WAV & MP3) ---
  const handleGenerateInlineAudio = async () => {
    if (!result?.translatedText) return;
    setIsGeneratingInlineSpeech(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: result.translatedText,
          targetLang: result.targetLang,
          language: result.targetLang.toLowerCase(),
          gender: 'female',
          voiceName: 'Kore',
          style: `Natural human speaker narrating translated script in ${result.targetLang}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const data = await response.json();
      if (data.audioUrl) {
        const wav = data.wavUrl || data.audioUrl;
        setInlineAudioUrl(wav);
        setInlineMp3Url(data.mp3Url || null);
        setInlineWavSize(data.wavSize || null);
        setInlineMp3Size(data.mp3Size || null);

        if (inlineAudioRef.current) {
          inlineAudioRef.current.src = wav;
          inlineAudioRef.current.load();
        }
        showSuccess(`Generated ${result.targetLang} audio in WAV and MP3 formats!`);
      }
    } catch (err: any) {
      console.error('Inline TTS error:', err);
      setErrorMessage(err.message || 'Failed to synthesize audio');
    } finally {
      setIsGeneratingInlineSpeech(false);
    }
  };

  const handleTogglePlayInline = () => {
    if (!inlineAudioRef.current || !inlineAudioUrl) return;
    if (isPlayingInline) {
      inlineAudioRef.current.pause();
      setIsPlayingInline(false);
    } else {
      inlineAudioRef.current.play().then(() => setIsPlayingInline(true)).catch(console.error);
    }
  };

  const handleDownloadInline = async (format: 'wav' | 'mp3') => {
    if (!inlineAudioUrl && !inlineMp3Url) return;
    setIsDownloadingInline(format);
    const filename = sanitizeAudioFilename('anof-translation', targetLang, 'kore', format);
    try {
      await downloadAudioFile({
        wavUrl: inlineAudioUrl,
        mp3Url: inlineMp3Url,
        format,
        filename,
      });
      showSuccess(`Downloaded ${format.toUpperCase()} audio file (${filename}).`);
    } catch (err: any) {
      console.error('Download inline error:', err);
      setErrorMessage(err.message || `Failed to download ${format.toUpperCase()}`);
    } finally {
      setIsDownloadingInline(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = inputText.length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <audio
        ref={inlineAudioRef}
        onEnded={() => setIsPlayingInline(false)}
      />

      {/* Hidden File Input supporting TXT, PDF, DOC, DOCX */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Studio Header Card - Fully Responsive */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400">
            <span>Universal Language Engine</span>
            <span>·</span>
            <span>Gemini 3.8 Flash Multilingual</span>
            <span>·</span>
            <span className="text-amber-400 font-medium">Bi-Directional Any Language</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Universal Language Converter &amp; Document Translator
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Translate documents and scripts accurately between <strong>English ⇄ French</strong>, <strong>Spanish</strong>, <strong>German</strong>, <strong>Japanese</strong>, <strong>Arabic</strong>, or any global language. Drag &amp; drop <strong>Word (.docx/.doc)</strong>, <strong>PDF</strong>, or <strong>TXT</strong> files, and export completed translations directly into <strong>Microsoft Word (.docx)</strong>, <strong>WAV</strong>, and <strong>MP3</strong> audio.
          </p>
        </div>

        {/* Quick Language Presets & Sample Loader */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            onClick={() => applyPreset('English', 'French')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              sourceLang === 'English' && targetLang === 'French'
                ? 'bg-amber-500 text-slate-950 font-semibold border-amber-500'
                : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            EN ➔ FR
          </button>
          <button
            onClick={() => applyPreset('French', 'English')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              sourceLang === 'French' && targetLang === 'English'
                ? 'bg-amber-500 text-slate-950 font-semibold border-amber-500'
                : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            FR ➔ EN
          </button>
          <button
            onClick={() => applyPreset('English', 'Spanish')}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] cursor-pointer"
          >
            EN ➔ ES
          </button>
          <button
            onClick={handleLoadSampleText}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition cursor-pointer"
            title="Load sample Miira-Coffee product presentation"
          >
            Load Sample
          </button>
        </div>
      </div>

      {/* Notifications: Success & Error */}
      {successMessage && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Dual-Pane Converter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Source Text Column */}
        <div className="lg:col-span-6 space-y-3 flex flex-col">
          {/* Responsive Language Selector Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0f1117] p-3 rounded-xl border border-white/[0.08]">
            {/* Source select */}
            <div className="flex items-center justify-between sm:justify-start gap-2 flex-1">
              <span className="text-xs font-medium text-slate-400 shrink-0">Source:</span>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#08090c] border border-white/[0.08] text-amber-300 focus:outline-none focus:border-amber-500/60 w-full sm:w-auto cursor-pointer"
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
            <div className="flex justify-center">
              <button
                onClick={handleSwapLanguages}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-amber-400 border border-white/[0.08] transition cursor-pointer"
                title="Swap Languages"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Target select */}
            <div className="flex items-center justify-between sm:justify-start gap-2 flex-1">
              <span className="text-xs font-medium text-slate-400 shrink-0">Target:</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#08090c] border border-white/[0.08] text-amber-300 focus:outline-none focus:border-amber-500/60 w-full sm:w-auto cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.name}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Document Access Bar: Drag & Drop / Upload (TXT, PDF, DOC, DOCX) */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0f1117] border border-white/[0.06] text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtractingDoc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 font-semibold border border-amber-500/30 transition cursor-pointer disabled:opacity-50"
              >
                {isExtractingDoc ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileUp className="w-3.5 h-3.5" />
                )}
                <span>Upload Document</span>
              </button>
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400">
                <span className="px-1.5 py-0.2 rounded bg-white/[0.05] border border-white/[0.08]">.DOCX</span>
                <span className="px-1.5 py-0.2 rounded bg-white/[0.05] border border-white/[0.08]">.DOC</span>
                <span className="px-1.5 py-0.2 rounded bg-white/[0.05] border border-white/[0.08]">.PDF</span>
                <span className="px-1.5 py-0.2 rounded bg-white/[0.05] border border-white/[0.08]">.TXT</span>
              </div>
            </div>

            {/* Extracted file pill or clear button */}
            {uploadedDocInfo ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px]">
                <File className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]" title={uploadedDocInfo.name}>
                  {uploadedDocInfo.name}
                </span>
                {uploadedDocInfo.words && (
                  <span className="text-slate-400 text-[10px]">
                    ({uploadedDocInfo.words.toLocaleString()}w)
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-0.5 hover:text-white ml-0.5"
                  title="Remove uploaded document"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : inputText.trim() ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-300 transition cursor-pointer"
                title="Clear input text"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            ) : null}
          </div>

          {/* Text Area & Drag-and-Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex-1 flex flex-col rounded-xl transition-all ${
              isDragging
                ? 'ring-2 ring-amber-500 bg-amber-500/5'
                : ''
            }`}
          >
            {/* Extraction Loader Overlay */}
            {isExtractingDoc && (
              <div className="absolute inset-0 z-20 rounded-xl bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                <p className="text-xs font-semibold text-white">Extracting Document Text...</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Parsing document structure and verbatim text</p>
              </div>
            )}

            {/* Drag Overlay visual indicator */}
            {isDragging && (
              <div className="absolute inset-0 z-20 rounded-xl bg-[#08090c]/90 border-2 border-dashed border-amber-400 flex flex-col items-center justify-center p-4 pointer-events-none text-center">
                <UploadCloud className="w-10 h-10 text-amber-400 animate-bounce mb-2" />
                <p className="text-sm font-bold text-white">Drop Document Here</p>
                <p className="text-xs text-amber-200/80 mt-1">Supports Word (.docx, .doc), PDF (.pdf), and Text (.txt)</p>
              </div>
            )}

            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (uploadedDocInfo) setUploadedDocInfo(null);
              }}
              rows={11}
              placeholder={`Type, paste, or drag & drop documents here (TXT, PDF, DOC, DOCX)...\n\ne.g. English presentation, medical text, marketing speech, product dossier, or literature to translate into ${targetLang}...`}
              className="w-full flex-1 min-h-[180px] sm:min-h-[250px] p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] text-slate-200 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:border-amber-500/60 resize-y shadow-inner"
            />

            {/* Empty dropzone prompt when no text entered */}
            {!inputText && !isDragging && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-x-4 bottom-4 py-3 px-4 rounded-lg border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition cursor-pointer flex items-center justify-center gap-2.5 text-xs text-slate-400 text-center"
              >
                <UploadCloud className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Drag &amp; drop <strong>.docx, .pdf, .doc, .txt</strong> files here, or tap to browse
                </span>
              </div>
            )}
          </div>

          {/* Action Bar: Tone selection + Word count + Translate button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0f1117] border border-white/[0.08]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Tone:</span>
              {(['natural', 'medical', 'commercial', 'casual'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`capitalize px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                    tone === t
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 bg-white/[0.02]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              {inputText.trim() && (
                <span className="text-[11px] font-mono text-slate-400">
                  {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
                </span>
              )}

              <button
                type="button"
                onClick={() => handleTranslate()}
                disabled={isTranslating || !inputText.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Translating to {targetLang}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
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
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0f1117] px-3 py-2.5 rounded-xl border border-white/[0.08]">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'text'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {targetLang} Text
              </button>
              <button
                onClick={() => setActiveTab('aligned')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'aligned'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setActiveTab('glossary')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'glossary'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Glossary ({result?.vocabulary.length || 0})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Word Document (.docx) Export Button */}
              {result && (
                <button
                  type="button"
                  onClick={() => handleDownloadWord('full')}
                  disabled={isExportingWord}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-500/40 font-semibold cursor-pointer transition disabled:opacity-50"
                  title="Download complete translation dossier in Microsoft Word (.docx)"
                >
                  {isExportingWord ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span>Download Word (.docx)</span>
                </button>
              )}

              {result && (
                <button
                  type="button"
                  onClick={() => handleCopy(result.translatedText, 'translated')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] cursor-pointer"
                  title="Copy translated text"
                >
                  {copied === 'translated' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied === 'translated' ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Result Content Area */}
          <div className="flex-1 bg-[#0f1117] rounded-xl border border-white/[0.08] p-4 overflow-y-auto min-h-[220px] max-h-[500px]">
            {result ? (
              <>
                {activeTab === 'text' && (
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-white/[0.06] flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 uppercase">
                          {targetLang} Title
                        </span>
                        <h3 className="text-sm sm:text-base font-semibold text-white mt-0.5">
                          {result.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                        Ready for Word &amp; Audio
                      </span>
                    </div>

                    <div className="space-y-3 text-xs sm:text-sm font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {result.translatedText}
                    </div>

                    {result.pronunciationNotes && (
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300">
                        <span className="font-semibold text-slate-200 block mb-0.5">
                          Vocal Guidance:
                        </span>
                        {result.pronunciationNotes}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'aligned' && (
                  <div className="space-y-2.5">
                    {result.sentencePairs.length > 0 ? (
                      result.sentencePairs.map((pair, idx) => (
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
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">
                        No sentence alignment pairs generated.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'glossary' && (
                  <div className="space-y-2">
                    {result.vocabulary.length > 0 ? (
                      result.vocabulary.map((vocab, vIdx) => (
                        <div
                          key={vIdx}
                          className="p-3 rounded-lg bg-[#08090c] border border-white/[0.04] space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1">
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
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">
                        No glossary items extracted for this text.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                <Languages className="w-10 h-10 text-slate-600 mb-1" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-300">
                    Your Translation will appear here
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Enter text or upload a document (Word, PDF, TXT) and tap &quot;Convert to {targetLang}&quot; to generate text, Word (.docx) export, and audio.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Toolbar to Listen, Download WAV/MP3, Download Word, or Send to Studio/Video */}
          {result && (
            <div className="p-3.5 rounded-xl bg-[#0f1117] border border-white/[0.08] space-y-3">
              {/* If inline audio exists, show player bar with WAV and MP3 downloads */}
              {inlineAudioUrl && (
                <div className="p-3 rounded-lg bg-[#08090c] border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleTogglePlayInline}
                      className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition cursor-pointer shadow-sm shrink-0"
                      title={isPlayingInline ? 'Pause' : 'Play'}
                    >
                      {isPlayingInline ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        {targetLang} Voice Track
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Available in Studio WAV or MP3
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleDownloadInline('wav')}
                      disabled={isDownloadingInline !== null}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                      title="Download uncompressed 24kHz Studio Master WAV"
                    >
                      {isDownloadingInline === 'wav' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Download WAV</span>
                      {inlineWavSize && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-950/20 font-mono">
                          {formatAudioSize(inlineWavSize)}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleDownloadInline('mp3')}
                      disabled={isDownloadingInline !== null}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/20 transition shadow-sm cursor-pointer disabled:opacity-50"
                      title="Download 192kbps MP3 (Web / Mobile)"
                    >
                      {isDownloadingInline === 'mp3' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>Download MP3</span>
                      {inlineMp3Size && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-amber-300 font-mono">
                          {formatAudioSize(inlineMp3Size)}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <span className="text-xs text-slate-400">
                  Export &amp; Production:
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Download Word Document Button in bottom bar */}
                  <button
                    type="button"
                    onClick={() => handleDownloadWord('full')}
                    disabled={isExportingWord}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                    title="Export complete dossier to Word (.docx)"
                  >
                    {isExportingWord ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span>Word (.docx)</span>
                  </button>

                  {!inlineAudioUrl && (
                    <button
                      type="button"
                      onClick={handleGenerateInlineAudio}
                      disabled={isGeneratingInlineSpeech}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-amber-300 text-xs font-semibold border border-white/[0.08] transition cursor-pointer disabled:opacity-50"
                      title="Generate voice in target language with WAV & MP3 downloads"
                    >
                      {isGeneratingInlineSpeech ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>Synthesizing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Generate Audio (WAV/MP3)</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSendToSpeech(result.translatedText, targetLang)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Voice Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSendToVideo(result.translatedText)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.08] transition cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    <span>Video</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
