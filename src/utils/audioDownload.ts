/**
 * Audio Download & Format Conversion Utility for Anof Studio
 * Supports direct WAV (Studio Master) and MP3 (Compressed 192kbps) downloads
 */

export function formatAudioSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeAudioFilename(
  prefix: string,
  language: string,
  voiceOrClone: string,
  format: 'wav' | 'mp3'
): string {
  const safeLang = (language || 'voice').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const safeVoice = (voiceOrClone || 'speaker').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const safePrefix = (prefix || 'anof').toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${safePrefix}-${safeLang}-${safeVoice}.${format}`;
}

/**
 * Downloads audio file in either WAV or MP3 format
 */
export async function downloadAudioFile(options: {
  wavUrl?: string | null;
  mp3Url?: string | null;
  format: 'wav' | 'mp3';
  filename?: string;
  onConvertingStart?: () => void;
  onConvertingEnd?: () => void;
}): Promise<void> {
  const { wavUrl, mp3Url, format, filename, onConvertingStart, onConvertingEnd } = options;

  let targetUrl: string | null = null;
  const defaultFilename = filename || `anof-audio-${Date.now()}.${format}`;

  if (format === 'mp3') {
    if (mp3Url && mp3Url.startsWith('data:audio/mp3')) {
      targetUrl = mp3Url;
    } else if (wavUrl) {
      // Need to convert WAV to MP3 on the fly
      try {
        onConvertingStart?.();
        const response = await fetch('/api/audio/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: wavUrl,
            targetFormat: 'mp3',
            bitrate: '192k',
          }),
        });
        const data = await response.json();
        if (data.audioUrl) {
          targetUrl = data.audioUrl;
        } else {
          throw new Error(data.error || 'MP3 conversion failed');
        }
      } catch (err) {
        console.warn('On-demand MP3 conversion error, falling back to server download stream:', err);
        // Fallback to server streaming download
        await downloadViaStream(wavUrl, 'mp3', defaultFilename);
        onConvertingEnd?.();
        return;
      } finally {
        onConvertingEnd?.();
      }
    }
  } else {
    // format === 'wav'
    targetUrl = wavUrl || mp3Url || null;
  }

  if (targetUrl) {
    triggerBrowserDownload(targetUrl, defaultFilename);
  } else {
    throw new Error('No audio source available to download');
  }
}

/**
 * Direct browser anchor tag download trigger
 */
export function triggerBrowserDownload(dataUrl: string, filename: string): void {
  try {
    // If it's a data url, convert to Blob for more reliable download across all browsers
    if (dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/wav';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Trigger download error:', err);
    // Direct window fallback
    window.location.href = dataUrl;
  }
}

/**
 * Server streaming download fallback
 */
async function downloadViaStream(audioData: string, format: 'wav' | 'mp3', filename: string) {
  const resp = await fetch('/api/audio/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioData, format, filename }),
  });
  if (!resp.ok) throw new Error('Download request failed');
  const blob = await resp.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}
