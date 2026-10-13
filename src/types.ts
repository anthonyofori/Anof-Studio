export type StudioMode =
  | 'tts'
  | 'translator'
  | 'voice-clone'
  | 'text-to-video'
  | 'image-to-text'
  | 'image-to-video';

export interface HumanVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  ageGroup: 'Young Adult' | 'Mature Adult' | 'Warm Narrative';
  timbreDescription: string;
  humanTraits: string[];
  bestUse: string;
  samplePhrase: string;
  baseModelVoice: 'Charon' | 'Puck' | 'Fenrir' | 'Kore' | 'Zephyr';
}

export interface VoiceClonePersona {
  id: string;
  name: string;
  gender: 'male' | 'female';
  timbre: string;
  accent: string;
  acousticProfile: string;
  recommendedBaseVoice: 'Charon' | 'Puck' | 'Fenrir' | 'Kore' | 'Zephyr';
  narrationGuidelines: string;
  sampleAudioUrl?: string;
  createdAt: string;
}

export interface VideoProject {
  id: string;
  type: 'text-to-video' | 'image-to-video';
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  durationSeconds: number;
  status: 'idle' | 'generating' | 'completed' | 'error';
  videoUrl?: string;
  operationName?: string;
  thumbnailUrl?: string;
  sourceImageUrl?: string;
  createdAt: string;
}

export interface ImageToTextResult {
  extractedText: string;
  productName: string;
  keyPoints: string[];
  suggestedVoiceScript: string;
  suggestedVideoPrompt: string;
  sourceImageUrl?: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface UniversalTranslationResult {
  sourceLang: string;
  targetLang: string;
  originalText: string;
  translatedText: string;
  title: string;
  sentencePairs: Array<{ source: string; target: string }>;
  vocabulary: Array<{ sourceTerm: string; targetTerm: string; explanation: string }>;
  pronunciationNotes?: string;
}
