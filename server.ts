import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import mammoth from 'mammoth';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateVideosOperation, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Shared Google GenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Audio transcoding helper: converts WAV Buffer to high-quality MP3 Buffer via ffmpeg
function convertWavToMp3Buffer(wavBuffer: Buffer, bitrate = '192k'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',        // Input from stdin
      '-f', 'mp3',          // Output format mp3
      '-b:a', bitrate,       // High quality 192kbps
      '-ac', '1',           // Voice mono channel (matches Gemini TTS output)
      'pipe:1'              // Output to stdout
    ]);

    const chunks: Buffer[] = [];
    let stderrData = '';

    ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
    ffmpeg.stderr.on('data', (err) => {
      stderrData += err.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.from(Buffer.concat(chunks)));
      } else {
        reject(new Error(`FFmpeg transcoding failed with code ${code}: ${stderrData.slice(-200)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg: ${err.message}`));
    });

    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();
  });
}

// Production retry helper for transient network / 503 demand spikes
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1200): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('UNAVAILABLE');
      if (isTransient && i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// 1. UNIVERSAL ANY-LANGUAGE CONVERTER / TRANSLATOR (English to French, French to English, or Any Language)
app.post('/api/translate', async (req, res) => {
  try {
    const {
      text,
      sourceLang = 'auto',
      targetLang = 'French',
      tone = 'natural',
      context = 'health & wellness product presentation',
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required for translation' });
    }

    const systemInstruction = `You are an elite multilingual translator, localization expert, and voice-over copywriter.
You can accurately translate text between ANY languages (e.g. English to French, French to English, Spanish, German, Japanese, Arabic, etc.).
Source language request: ${sourceLang}.
Target language request: ${targetLang}.
Tone: ${tone}.
Context: ${context}.

Rules:
1. Translate accurately, naturally, and idiomatically into the target language (${targetLang}).
2. Maintain brand names and trademark names like "Miira-Coffee" properly.
3. Correctly localize botanical, health, and medical terminology.
4. Auto-detect the source language if "auto" was passed.
5. Provide sentence pairs aligning the source sentences with target sentences.
6. Extract key terminology / vocabulary items with clear explanations.
7. Provide pronunciation / narration guidance for vocal speech synthesis.`;

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Translate the following text into ${targetLang} (Source: ${sourceLang}):\n\n${text}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedSourceLang: { type: Type.STRING },
              targetLang: { type: Type.STRING },
              title: { type: Type.STRING },
              translatedText: { type: Type.STRING },
              sentencePairs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                  },
                  required: ['source', 'target'],
                },
              },
              vocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sourceTerm: { type: Type.STRING },
                    targetTerm: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['sourceTerm', 'targetTerm', 'explanation'],
                },
              },
              pronunciationNotes: { type: Type.STRING },
            },
            required: ['detectedSourceLang', 'targetLang', 'title', 'translatedText', 'sentencePairs', 'vocabulary'],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to translate text',
    });
  }
});

// 2. TEXT-TO-SPEECH (Realistic Human Voice with Male/Female options, Multi-Language, & Voice Cloning)
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Charon',
      gender = 'male',
      language = 'en',
      targetLang = 'English',
      autoTranslate = false,
      style = 'natural human conversation',
      isCloned = false,
      clonePersona = null,
      realisticOptions = { addBreaths: true, emotionalWarmth: 'high', cadence: 'natural' },
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required for speech synthesis' });
    }

    const langLabel = targetLang || (language === 'fr' ? 'French' : 'English');

    // Auto-translate if requested
    let textToSynthesize = text.trim();
    let translatedText: string | undefined = undefined;

    if (autoTranslate && targetLang) {
      try {
        const transPrompt = `Translate the following text into ${targetLang} with accurate natural idiomatic phrasing, maintaining all brand and product names (such as Miira-Coffee) and active botanical ingredients, ready for vocal human speech narration:\n\n${textToSynthesize}`;
        const transResp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: transPrompt,
        });
        if (transResp.text && transResp.text.trim()) {
          textToSynthesize = transResp.text.trim();
          translatedText = textToSynthesize;
        }
      } catch (transErr) {
        console.warn('Auto-translation before TTS failed, falling back to original text:', transErr);
      }
    }

    // Map requested voice
    const validVoices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
    let selectedVoice = validVoices.includes(voiceName) ? voiceName : (gender === 'female' ? 'Kore' : 'Charon');

    // Build realistic human voice prompt in the target language
    let humanVoiceDirective = '';

    if (isCloned && clonePersona) {
      humanVoiceDirective = `Speak in ${langLabel} as this specific cloned human individual: ${clonePersona.description || 'Authentic human voice'}. Timbre: ${clonePersona.timbre || 'Warm and grounded'}. Accent: ${clonePersona.accent || 'Natural'}. Emulate their organic human vocal rhythm, natural breathing patterns, subtle vocal cord texture, and native ${langLabel} phonetics. Strictly avoid any robotic or synthetic AI pitch contours.`;
    } else {
      const genderLabel = gender === 'female' ? 'female' : 'male';
      humanVoiceDirective = `Authentic, hyper-realistic human ${genderLabel} speaker speaking fluently in ${langLabel}. Tone: ${style}. Organic human breathing pauses, subtle dynamic pitch micro-inflections, warm acoustic resonance, and native ${langLabel} conversational cadence. Must sound 100% human and alive, completely free of any artificial or robotic synthesizer qualities.`;
    }

    // Add optional human speech bursts
    let processedText = textToSynthesize;
    if (realisticOptions?.addBreaths && !processedText.includes('<breath>')) {
      processedText = `<breath> ${processedText}`;
    }

    // Model required: gemini-3.8-flash-tts
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: processedText,
                speechMetadata: {
                  style: humanVoiceDirective,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      })
    );

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No audio data received from Gemini 3.8 Flash TTS');
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    let mp3Base64: string | null = null;
    let mp3Size = 0;
    try {
      const mp3Buffer = await convertWavToMp3Buffer(wavBuffer, '192k');
      mp3Base64 = mp3Buffer.toString('base64');
      mp3Size = mp3Buffer.length;
    } catch (mp3Err) {
      console.warn('MP3 transcoding error:', mp3Err);
    }

    const wavUrl = `data:audio/wav;base64,${base64Audio}`;
    const mp3Url = mp3Base64 ? `data:audio/mp3;base64,${mp3Base64}` : null;

    return res.json({
      audioUrl: wavUrl,
      wavUrl,
      mp3Url,
      wavSize: wavBuffer.length,
      mp3Size,
      format: 'audio/wav',
      formats: {
        wav: wavUrl,
        mp3: mp3Url,
      },
      voice: selectedVoice,
      gender,
      language: langLabel,
      translatedText,
      isCloned,
      characters: textToSynthesize.length,
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    return res.status(500).json({
      error: error.message || 'Speech synthesis failed',
    });
  }
});

// 2b. AUDIO CONVERSION ENDPOINT (Convert WAV to MP3 on demand)
app.post('/api/audio/convert', async (req, res) => {
  try {
    const { audioData, targetFormat = 'mp3', bitrate = '192k' } = req.body;
    if (!audioData || typeof audioData !== 'string') {
      return res.status(400).json({ error: 'audioData base64 string is required' });
    }

    const cleanBase64 = audioData.replace(/^data:audio\/[a-zA-Z0-9.\-_]+;base64,/, '');
    const inputBuffer = Buffer.from(cleanBase64, 'base64');

    if (targetFormat.toLowerCase() === 'mp3') {
      const mp3Buffer = await convertWavToMp3Buffer(inputBuffer, bitrate);
      const mp3Base64 = mp3Buffer.toString('base64');
      return res.json({
        success: true,
        format: 'mp3',
        mimeType: 'audio/mp3',
        audioUrl: `data:audio/mp3;base64,${mp3Base64}`,
        size: mp3Buffer.length,
      });
    } else {
      return res.json({
        success: true,
        format: 'wav',
        mimeType: 'audio/wav',
        audioUrl: `data:audio/wav;base64,${cleanBase64}`,
        size: inputBuffer.length,
      });
    }
  } catch (err: any) {
    console.error('Audio conversion error:', err);
    return res.status(500).json({ error: err.message || 'Audio conversion failed' });
  }
});

// 2c. AUDIO STREAMING DOWNLOAD (Binary attachment for robust downloading)
app.post('/api/audio/download', async (req, res) => {
  try {
    const { audioData, format = 'wav', filename = 'anof-audio' } = req.body;
    if (!audioData || typeof audioData !== 'string') {
      return res.status(400).json({ error: 'audioData is required' });
    }

    const cleanBase64 = audioData.replace(/^data:audio\/[a-zA-Z0-9.\-_]+;base64,/, '');
    let buffer: Buffer<any> = Buffer.from(cleanBase64, 'base64');
    const ext = format.toLowerCase() === 'mp3' ? 'mp3' : 'wav';
    const mimeType = ext === 'mp3' ? 'audio/mpeg' : 'audio/wav';

    if (ext === 'mp3' && !audioData.startsWith('data:audio/mp3')) {
      try {
        buffer = await convertWavToMp3Buffer(buffer, '192k');
      } catch (convErr) {
        console.warn('Could not transcode for download stream, using original buffer:', convErr);
      }
    }

    const cleanFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err: any) {
    console.error('Audio download streaming error:', err);
    return res.status(500).json({ error: err.message || 'Failed to download audio' });
  }
});

// 3. VOICE CLONE ANALYZER (Acoustic extraction & persona profile builder)
app.post('/api/voice-clone/analyze', async (req, res) => {
  try {
    const {
      audioSampleBase64,
      mimeType = 'audio/webm',
      voiceName = 'Custom Voice Persona',
      gender = 'male',
      vocalTraits = 'warm, textured, conversational, clear human diction',
      accent = 'Neutral American/British',
    } = req.body;

    let analysisPrompt = `You are a world-class audio engineer and vocal biometric acoustic profiler.
Create a hyper-realistic human Voice Clone profile for a ${gender} speaker named "${voiceName}".
Traits: ${vocalTraits}, Accent: ${accent}.
Synthesize an acoustic profile defining:
1. "personaName": String
2. "gender": "${gender}"
3. "timbre": e.g. "Warm resonant baritone with rich chest harmonics and gentle breathiness"
4. "accent": e.g. "${accent}"
5. "acousticProfile": String describing frequency warmth, pitch variation, and cadence
6. "recommendedBaseVoice": "Charon" (for deep male), "Puck" (for energetic male), "Fenrir" (for bass male), "Kore" (for warm female), "Zephyr" (for soft female)
7. "narrationGuidelines": Directives to make speech sound identical to this human individual
Return purely valid JSON matching these fields.`;

    const parts: any[] = [];
    if (audioSampleBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType.split(';')[0],
          data: audioSampleBase64.replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, ''),
        },
      });
      parts.push({
        text: `Analyze the uploaded voice sample audio to extract its acoustic signature, vocal timbre, formant resonance, and exact human speech rhythm. ${analysisPrompt}`,
      });
    } else {
      parts.push({ text: analysisPrompt });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      clonePersona: {
        id: `clone-${Date.now()}`,
        name: parsed.personaName || voiceName,
        gender: parsed.gender || gender,
        timbre: parsed.timbre || vocalTraits,
        accent: parsed.accent || accent,
        acousticProfile: parsed.acousticProfile || 'Human vocal tract resonance with organic cadence',
        recommendedBaseVoice: parsed.recommendedBaseVoice || (gender === 'female' ? 'Kore' : 'Charon'),
        narrationGuidelines: parsed.narrationGuidelines || 'Natural human inflection and relaxed breathing',
      },
    });
  } catch (error: any) {
    console.error('Voice clone analysis error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze voice sample',
    });
  }
});

// 4. IMAGE TO TEXT (OCR & Multimodal Vision Analysis in Any Language)
app.post('/api/image-to-text', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', targetLanguage = 'English' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType.split(';')[0],
              data: cleanBase64,
            },
          },
          {
            text: `Extract all readable text from this image accurately.
Target language for analysis: ${targetLanguage}.
Also provide a structured breakdown:
1. "extractedText": Complete verbatim text in original or ${targetLanguage}.
2. "productName": Product name or main topic.
3. "keyPoints": Array of strings highlighting the main claims, ingredients, or messages.
4. "suggestedVoiceScript": A polished 30-45 second voice-over script in natural ${targetLanguage} ready for human-like Text-to-Speech narration.
5. "suggestedVideoPrompt": A cinematic visual prompt describing a commercial or video scene based on this image.
Return strictly valid JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Image to text error:', error);
    return res.status(500).json({ error: error.message || 'Failed to extract text from image' });
  }
});

// 5. TEXT TO VIDEO (Veo 3.1 Lite)
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, aspectRatio = '16:9', resolution = '720p' } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Video prompt is required' });
    }

    try {
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt.trim(),
        config: {
          numberOfVideos: 1,
          resolution: (resolution === '1080p' ? '1080p' : '720p'),
          aspectRatio: (aspectRatio === '9:16' ? '9:16' : '16:9'),
        },
      });

      return res.json({
        operationName: operation.name,
        prompt,
        status: 'queued',
      });
    } catch (veoError: any) {
      console.warn('Veo generate-video call notice:', veoError.message);
      return res.status(200).json({
        operationName: null,
        error: veoError.message,
        needsPaidKey: veoError.message?.includes('API key') || veoError.status === 403 || veoError.status === 402,
        prompt,
      });
    }
  } catch (error: any) {
    console.error('Text-to-video error:', error);
    return res.status(500).json({ error: error.message || 'Video generation failed' });
  }
});

// 6. IMAGE TO VIDEO (Veo 3.1 Lite from Starting Image)
app.post('/api/image-to-video', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', prompt = 'Cinematic slow camera pan, ambient atmospheric lighting', aspectRatio = '16:9' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image is required for image-to-video generation' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');

    try {
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt.trim(),
        image: {
          imageBytes: cleanBase64,
          mimeType: mimeType.split(';')[0],
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: (aspectRatio === '9:16' ? '9:16' : '16:9'),
        },
      });

      return res.json({
        operationName: operation.name,
        prompt,
        status: 'queued',
      });
    } catch (veoError: any) {
      console.warn('Veo image-to-video call notice:', veoError.message);
      return res.status(200).json({
        operationName: null,
        error: veoError.message,
        needsPaidKey: veoError.message?.includes('API key') || veoError.status === 403 || veoError.status === 402,
        prompt,
      });
    }
  } catch (error: any) {
    console.error('Image-to-video error:', error);
    return res.status(500).json({ error: error.message || 'Image to video generation failed' });
  }
});

// 7. VIDEO STATUS POLLING
app.post('/api/video-status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    const isDone = updated.done === true;
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    return res.json({
      done: isDone,
      hasUri: Boolean(uri),
      error: updated.error || null,
    });
  } catch (error: any) {
    console.error('Video status error:', error);
    return res.status(500).json({ error: error.message || 'Failed to poll video status' });
  }
});

// 8. VIDEO DOWNLOAD & STREAM
app.post('/api/video-download', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: 'Video URI not available yet' });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to fetch video stream from Google storage: ${videoRes.statusText}`);
    }

    res.setHeader('Content-Type', 'video/mp4');
    const arrayBuffer = await videoRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('Video download error:', error);
    return res.status(500).json({ error: error.message || 'Failed to stream video' });
  }
});

// 9. DOCUMENT TEXT EXTRACTION (TXT, PDF, DOC, DOCX via Mammoth & Gemini Multimodal)
app.post('/api/document/extract', async (req, res) => {
  try {
    const { fileData, fileName = 'document.txt', mimeType = '' } = req.body;
    if (!fileData || typeof fileData !== 'string') {
      return res.status(400).json({ error: 'fileData base64 string is required' });
    }

    const cleanBase64 = fileData.replace(/^data:[a-zA-Z0-9.\-_+/]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const lowerName = fileName.toLowerCase();

    let extractedText = '';

    // Plain text files
    if (lowerName.endsWith('.txt') || mimeType === 'text/plain') {
      extractedText = buffer.toString('utf-8');
    }
    // DOCX files (Word OpenXML)
    else if (lowerName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const mammothResult = await mammoth.extractRawText({ buffer });
        if (mammothResult.value && mammothResult.value.trim()) {
          extractedText = mammothResult.value;
        }
      } catch (docErr) {
        console.warn('Mammoth extraction failed, falling back to Gemini multimodal:', docErr);
      }
    }

    // PDF, DOC, or fallback if mammoth didn't produce text
    if (!extractedText.trim()) {
      let docMime = mimeType;
      if (lowerName.endsWith('.pdf')) {
        docMime = 'application/pdf';
      } else if (lowerName.endsWith('.docx')) {
        docMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (lowerName.endsWith('.doc')) {
        docMime = 'application/msword';
      } else if (!docMime) {
        docMime = 'application/pdf';
      }

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: docMime,
                    data: cleanBase64,
                  },
                },
                {
                  text: 'Extract and transcribe the complete verbatim text from this document. Maintain paragraph breaks, headers, and bullet lists accurately. Do not add any commentary, preamble, summary, or explanations.',
                },
              ],
            },
          ],
        });
        extractedText = response.text || '';
      } catch (geminiErr: any) {
        // Fallback for legacy .doc binary stream
        if (lowerName.endsWith('.doc') || !extractedText) {
          const rawStr = buffer.toString('latin1');
          const printable = rawStr.match(/[\x20-\x7E\xA0-\xFF\n\r\t]{4,}/g);
          if (printable && printable.length > 0) {
            extractedText = printable.join('\n');
          } else {
            throw geminiErr;
          }
        } else {
          throw geminiErr;
        }
      }
    }

    const cleanText = extractedText.trim();
    if (!cleanText) {
      return res.status(422).json({ error: 'No readable text could be extracted from this document.' });
    }

    const words = cleanText.split(/\s+/).filter(Boolean).length;
    return res.json({
      success: true,
      text: cleanText,
      fileName,
      words,
      characters: cleanText.length,
    });
  } catch (error: any) {
    console.error('Document extraction error:', error);
    return res.status(500).json({ error: error.message || 'Failed to extract text from document' });
  }
});

// Mount Vite or static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Multimodal Studio with Any-Language Translator running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
