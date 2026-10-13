import React, { useState } from 'react';
import {
  Upload,
  FileText,
  Copy,
  Check,
  Volume2,
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ImageToTextResult } from '../types';
import { DEFAULT_IMAGE_TO_TEXT_RESULT } from '../data/defaultData';

interface ImageToTextStudioProps {
  onSendToSpeech: (text: string) => void;
  onSendToVideo: (prompt: string) => void;
}

export const ImageToTextStudio: React.FC<ImageToTextStudioProps> = ({
  onSendToSpeech,
  onSendToVideo,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImageToTextResult>(DEFAULT_IMAGE_TO_TEXT_RESULT);
  const [copied, setCopied] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setImagePreview(base64Data);

      setIsProcessing(true);
      try {
        const response = await fetch('/api/image-to-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || 'image/png',
          }),
        });

        if (!response.ok) {
          throw new Error('Image vision analysis failed');
        }

        const data = await response.json();
        setResult({
          productName: data.productName || 'Extracted Product',
          extractedText: data.extractedText || '',
          keyPoints: data.keyPoints || [],
          suggestedVoiceScript: data.suggestedVoiceScript || data.extractedText,
          suggestedVideoPrompt: data.suggestedVideoPrompt || '',
          sourceImageUrl: base64Data,
        });
      } catch (err: any) {
        console.error('Vision error:', err);
        setErrorMsg(err.message || 'Failed to extract text from image');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Multimodal Document Vision</span>
            <span>·</span>
            <span>Gemini 3.8 Flash OCR</span>
            <span>·</span>
            <span className="text-amber-400 font-medium">Image to Text &amp; Analysis</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Image to Text &amp; Vision Extraction
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload product photos, nutrition labels, or slide presentations to extract verbatim text and automatically structure key points.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] space-y-3">
            <span className="text-xs font-semibold text-slate-300 block">
              Document or Product Image Source:
            </span>

            <label className="p-6 rounded-xl bg-[#08090c] border border-dashed border-white/[0.1] hover:border-amber-500/40 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition">
              <Upload className="w-5 h-5 text-amber-400" />
              <span className="text-xs text-slate-200 font-medium">
                Upload Image or Presentation Slide
              </span>
              <span className="text-[10px] text-slate-500">
                Supports PNG, JPG, or WebP
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>

            {imagePreview && (
              <div className="rounded-lg overflow-hidden border border-white/[0.08] max-h-[260px] flex items-center justify-center bg-black">
                <img
                  src={imagePreview}
                  alt="Uploaded source"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {isProcessing && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Extracting English text and structuring points...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Extracted Breakdown Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl bg-[#0f1117] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-400">
                  Detected Subject
                </span>
                <h3 className="text-base font-semibold text-white">
                  {result.productName}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSendToSpeech(result.suggestedVoiceScript || result.extractedText)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold shadow-sm hover:bg-amber-400 transition cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Send to Speech</span>
                </button>
                <button
                  onClick={() => onSendToVideo(result.suggestedVideoPrompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.08] transition cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>Send to Video</span>
                </button>
              </div>
            </div>

            {/* Extracted Verbatim Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Verbatim Extracted Content
                </span>
                <button
                  onClick={() => copyToClipboard(result.extractedText, 'verbatim')}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  {copied === 'verbatim' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied === 'verbatim' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-3.5 rounded-lg bg-[#08090c] border border-white/[0.04] text-xs font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {result.extractedText}
              </div>
            </div>

            {/* Key Claims */}
            {result.keyPoints.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <span className="text-xs font-semibold text-slate-300 block">
                  Structured Claims &amp; Active Principles
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {result.keyPoints.map((point, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#08090c] border border-white/[0.04] text-xs text-slate-300 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
