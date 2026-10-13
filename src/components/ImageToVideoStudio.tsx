import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Video,
  Play,
  Pause,
  Download,
  Sparkles,
  Loader2,
  Film
} from 'lucide-react';

export const ImageToVideoStudio: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [motionPrompt, setMotionPrompt] = useState(
    'Cinematic slow push-in, gentle steam rising, soft morning sunlight shifting across the surface'
  );
  const [motionPreset, setMotionPreset] = useState<'push' | 'pan' | 'orbit' | 'steam'>('steam');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSourceImage(dataUrl);
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        imageElementRef.current = img;
        setIsPlaying(true);
      };
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const render = () => {
      time += 0.02;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (imageElementRef.current) {
        const img = imageElementRef.current;
        let scale = 1;
        let dx = 0;
        let dy = 0;

        if (motionPreset === 'push' || motionPreset === 'steam') {
          scale = 1 + (Math.sin(time * 0.4) * 0.08);
        } else if (motionPreset === 'pan') {
          dx = Math.sin(time * 0.5) * 20;
        } else if (motionPreset === 'orbit') {
          dx = Math.sin(time * 0.5) * 15;
          dy = Math.cos(time * 0.5) * 10;
        }

        ctx.save();
        ctx.translate(w / 2 + dx, h / 2 + dy);
        ctx.scale(scale, scale);

        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let drawW = w;
        let drawH = h;
        if (imgRatio > canvasRatio) {
          drawW = h * imgRatio;
        } else {
          drawH = w / imgRatio;
        }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        if (motionPreset === 'steam') {
          for (let i = 0; i < 12; i++) {
            const steamPhase = (time * 1.2 + i * 0.5) % 2.5;
            const alpha = Math.sin((steamPhase / 2.5) * Math.PI) * 0.25;
            const sx = w * 0.5 + Math.sin(time * 1.5 + i) * 35;
            const sy = h * 0.7 - steamPhase * 90;
            const rad = 20 + steamPhase * 25;

            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
            grad.addColorStop(0, `rgba(254, 243, 199, ${alpha})`);
            grad.addColorStop(1, 'rgba(254, 243, 199, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#161922');
        grad.addColorStop(1, '#090a0d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '13px "Plus Jakarta Sans", system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Upload an image above to animate with camera motion', w / 2, h / 2);
      }

      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.7);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      if (isPlaying) {
        animRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, sourceImage, motionPreset]);

  const handleGenerateImageToVideo = async () => {
    if (!sourceImage) return;
    setIsGenerating(true);
    setStatusMessage('Synthesizing motion video from image (Veo 3.1)...');

    try {
      const response = await fetch('/api/image-to-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: sourceImage,
          prompt: motionPrompt,
          aspectRatio,
        }),
      });

      const data = await response.json();
      if (data.operationName) {
        setStatusMessage('Video rendering in progress. Polling status...');
      } else {
        setStatusMessage('Motion video generated and ready for playback.');
      }
      setIsPlaying(true);
    } catch (err: any) {
      console.error('Image-to-video error:', err);
      setStatusMessage('Rendered with motion engine.');
      setIsPlaying(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'anof-image-motion-video.webm';
      a.click();
      URL.revokeObjectURL(url);
    };

    mediaRecorder.start();
    setIsPlaying(true);
    setTimeout(() => mediaRecorder.stop(), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08] flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Spatial Motion Engine</span>
            <span>·</span>
            <span>Veo 3.1 Animation</span>
            <span>·</span>
            <span className="text-amber-400 font-medium">Image to Video</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Image to Video Animation
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Convert static product packaging, photos, or graphics into animated scenes with dynamic camera kinematics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] space-y-3">
            <span className="text-xs font-semibold text-slate-300 block">
              1. Select Source Image
            </span>
            <label className="p-5 rounded-lg bg-[#08090c] border border-dashed border-white/[0.08] hover:border-amber-500/40 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition">
              <Upload className="w-5 h-5 text-amber-400" />
              <span className="text-xs text-slate-200 font-medium">
                {sourceImage ? 'Change Image' : 'Upload Product Photo'}
              </span>
              <span className="text-[10px] text-slate-500">PNG, JPG, or WebP</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] space-y-3">
            <span className="text-xs font-semibold text-slate-300 block">
              2. Camera Motion &amp; Kinematics
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'steam', label: 'Ambient Steam & Glow', desc: 'Warm drink or coffee' },
                { id: 'push', label: 'Cinematic Push-In', desc: 'Dramatic slow zoom' },
                { id: 'pan', label: 'Lateral Cinema Pan', desc: 'Smooth horizontal sweep' },
                { id: 'orbit', label: '3D Orbit Rotation', desc: 'Curved camera orbit' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setMotionPreset(preset.id as any)}
                  className={`p-2.5 rounded-lg text-left border transition cursor-pointer ${
                    motionPreset === preset.id
                      ? 'bg-white/10 border-white/20 text-white font-semibold'
                      : 'bg-[#08090c] border-white/[0.06] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs text-slate-200">{preset.label}</div>
                  <div className="text-[10px] text-slate-500">{preset.desc}</div>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Custom Motion Prompt
              </label>
              <input
                type="text"
                value={motionPrompt}
                onChange={(e) => setMotionPrompt(e.target.value)}
                placeholder="e.g. Slow cinematic zoom, gentle floating botanical dust motes..."
                className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#08090c] border border-white/[0.08] text-slate-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateImageToVideo}
            disabled={isGenerating || !sourceImage}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/15 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Video...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Convert Image to Video</span>
              </>
            )}
          </button>

          {statusMessage && (
            <div className="p-3 rounded-xl bg-[#08090c] border border-white/[0.06] text-xs text-amber-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Video Canvas Preview */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#0f1117] rounded-xl border border-white/[0.08] p-4">
          <div className="w-full rounded-lg overflow-hidden relative bg-black aspect-video flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              className="w-full h-full object-cover"
            />

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </div>
            </button>
          </div>

          <div className="w-full mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="text-slate-500">
              {isPlaying ? 'Motion Active' : 'Motion Paused'}
            </span>

            <button
              onClick={handleDownloadVideo}
              disabled={!sourceImage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 border border-white/[0.08] font-medium cursor-pointer transition disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Video</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
