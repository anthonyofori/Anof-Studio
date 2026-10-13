import {
  HumanVoice,
  VoiceClonePersona,
  ImageToTextResult,
  LanguageOption,
} from '../types';

export const DEFAULT_ENGLISH_SCRIPT = `The next product we want to look at is Miira-Coffee. This is our decaffeinated Arabica coffee, meaning that it's decaffeinated. The amount of caffeine level in this particular supplement is removed. About 90 to 95 percent of the caffeine here is removed. And aside removing the number of caffeine here, a certain active composition have been added, that are very beneficial to our health, active compositions like the dates powder, the mangosteen skin extract, the black seed powder, the fingerroot extract, the sucralose. Together these active compositions have various functions that they play within our system, and this gives us energy. We all know dates give a lot of energy to our system. The mangosteen skin extract contains certain active composition called the xanthones. Basically, it has a lot of anti-cancer properties. The black seed powder basically helps you control your blood sugar levels and your hypertension or your high blood pressure.

This decaffeinated coffee basically boosts up your energy levels. It improves your immunity. It provides you with antioxidant support. It also gives the anti-inflammatory support. To those of you battling with chronic pains in your knees, your neck, your shoulders, your waist, this particular supplement will relieve you from all those pains. It also helps you address your stress, chronic fatigue. All you need is hot water. One sachet first thing in the morning. You consume one sachet of Miira Coffee and you're good to go. Your day will be good.`;

export const DEFAULT_FRENCH_SCRIPT = `Le prochain produit que nous souhaitons découvrir est le Miira-Coffee. Il s'agit de notre café Arabica décaféiné, ce qui signifie qu'il est sans caféine. La caféine présente dans ce complément spécifique a été en grande partie éliminée, à hauteur d'environ 90 à 95 %. Et au-delà de cette réduction de caféine, certains principes actifs très bénéfiques pour notre santé ont été ajoutés : de la poudre de dattes, de l'extrait d'écorce de mangoustan, de la poudre de nigelle (graines noires), de l'extrait de gingembre clé (racine de doigt) et du sucralose. Ensemble, ces principes actifs remplissent différentes fonctions essentielles dans notre organisme et nous procurent une énergie durable. Nous savons tous que les dattes apportent une formidable vitalité au corps. L'extrait d'écorce de mangoustan contient un principe actif remarquable appelé les xanthones, reconnu pour ses puissantes vertus anticancéreuses. Quant à la poudre de nigelle, elle vous aide principalement à réguler votre glycémie ainsi que votre hypertension ou tension artérielle élevée.

Ce café décaféiné stimule naturellement votre niveau d'énergie. Il renforce vos défenses immunitaires. Il vous apporte un précieux soutien antioxydant ainsi qu'une action anti-inflammatoire remarquable. Pour tous ceux d'entre vous qui souffrent de douleurs chroniques aux genoux, au cou, aux épaules ou aux lombes, ce complément spécifique vous soulagera de toutes ces douleurs. Il vous aide également à surmonter le stress et la fatigue chronique. Tout ce dont vous avez besoin, c'est d'un peu d'eau chaude. Un seul sachet dès le réveil le matin : dégustez un sachet de Miira-Coffee et vous voilà prêt à démarrer. Votre journée sera excellente.`;

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (Mandarin)', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
];

// Ultra-realistic Human Voice Library (Male & Female)
export const REALISTIC_HUMAN_VOICES: HumanVoice[] = [
  {
    id: 'charon-male',
    name: 'David',
    gender: 'male',
    ageGroup: 'Mature Adult',
    timbreDescription: 'Deep, resonant baritone with rich vocal cord harmonics and authentic conversational pacing.',
    humanTraits: ['Organic breathing pauses', 'Warm chest resonance', 'Zero synthetic robotic stiffness'],
    bestUse: 'Documentaries, health presentations, trusted educational narration',
    samplePhrase: 'Welcome. Today we are looking at an exceptional supplement crafted with natural botanical extracts.',
    baseModelVoice: 'Charon',
  },
  {
    id: 'puck-male',
    name: 'Marcus',
    gender: 'male',
    ageGroup: 'Young Adult',
    timbreDescription: 'Crisp, conversational, and energetic everyday human male voice with natural speech rhythm.',
    humanTraits: ['Engaging micro-cadence', 'Approachable and friendly', 'Clear human articulation'],
    bestUse: 'Commercials, product showcases, podcast intros',
    samplePhrase: 'Just one sachet first thing in the morning with hot water, and you are ready for the entire day!',
    baseModelVoice: 'Puck',
  },
  {
    id: 'fenrir-male',
    name: 'Arthur',
    gender: 'male',
    ageGroup: 'Warm Narrative',
    timbreDescription: 'Authoritative, grounded bass voice with steady, thoughtful human delivery.',
    humanTraits: ['Rich low-end warmth', 'Deliberate human pauses', 'Natural vocal presence'],
    bestUse: 'Audiobooks, luxury brand videos, scientific reviews',
    samplePhrase: 'Active ingredients like dates powder, mangosteen, and black seed provide comprehensive cellular defense.',
    baseModelVoice: 'Fenrir',
  },
  {
    id: 'kore-female',
    name: 'Sarah',
    gender: 'female',
    ageGroup: 'Warm Narrative',
    timbreDescription: 'Warm, natural, and compassionate female voice with lifelike breathing and organic intonation.',
    humanTraits: ['Gentle breath intake', 'Conversational human empathy', 'Flawless enunciation'],
    bestUse: 'Wellness guides, health supplements, mindful tutorials',
    samplePhrase: 'This decaffeinated Arabica coffee gently boosts your energy levels while protecting your immune system.',
    baseModelVoice: 'Kore',
  },
  {
    id: 'zephyr-female',
    name: 'Elena',
    gender: 'female',
    ageGroup: 'Young Adult',
    timbreDescription: 'Soft, velvety, and soothing human female voice with delicate conversational warmth.',
    humanTraits: ['Intimate human tone', 'Smooth natural flow', 'Relaxed throat acoustic contour'],
    bestUse: 'Lifestyle commercials, meditation, premium consumer brands',
    samplePhrase: 'Relieve chronic fatigue and joint discomfort with a warm morning ritual that restores your vitality.',
    baseModelVoice: 'Zephyr',
  },
];

// Preconfigured Realistic Human Voice Clones
export const DEFAULT_VOICE_CLONES: VoiceClonePersona[] = [
  {
    id: 'clone-dr-julian',
    name: 'Dr. Julian Sterling (Cloned Clinician)',
    gender: 'male',
    timbre: 'Rich mid-tone baritone with authentic clinical authority, subtle vocal fry, and deliberate pauses',
    accent: 'Warm British-Atlantic English',
    acousticProfile: 'Enhanced vocal cord presence, 115Hz base pitch, subtle breath marks between medical clauses',
    recommendedBaseVoice: 'Charon',
    narrationGuidelines: 'Speak with deep human sincerity, organic breath pauses before key active compounds, and authentic cadence.',
    createdAt: 'Default Verified Clone',
  },
  {
    id: 'clone-clara',
    name: 'Clara Vance (Cloned Lifestyle Host)',
    gender: 'female',
    timbre: 'Bright, smiling, energetic conversational female voice with natural laughter inflection',
    accent: 'Neutral American English',
    acousticProfile: '210Hz resonant formant, relaxed diaphragm airflow, dynamic upbeat human rhythm',
    recommendedBaseVoice: 'Kore',
    narrationGuidelines: 'Convey genuine enthusiasm, natural breath intake, and relatable friend-to-friend advice.',
    createdAt: 'Default Verified Clone',
  },
];

// Default Image to Text sample data (Miira Coffee Analysis)
export const DEFAULT_IMAGE_TO_TEXT_RESULT: ImageToTextResult = {
  productName: 'Miira-Coffee (Functional Decaffeinated Arabica)',
  extractedText: DEFAULT_ENGLISH_SCRIPT,
  keyPoints: [
    'Decaffeinated Arabica: 90% to 95% of caffeine removed to eliminate jitters and palpitations.',
    'Active Botanicals: Dates powder, mangosteen skin extract, black seed powder, fingerroot extract, and sucralose.',
    'Cellular Defense: Mangosteen skin contains xanthones with potent antioxidant & anti-cancer properties.',
    'Metabolic Balance: Black seed powder helps regulate blood sugar levels and maintain healthy blood pressure.',
    'Pain & Inflammation Relief: Alleviates chronic pains in knees, neck, shoulders, and waist/lumbar area.',
    'Easy Preparation: Dissolve one sachet in hot water first thing every morning.',
  ],
  suggestedVoiceScript: `Meet Miira-Coffee: premium Arabica coffee with 95% of caffeine removed, supercharged with nature's most potent botanicals. With antioxidant-rich mangosteen xanthones, blood-sugar-balancing black seed, and energy-giving dates powder, it provides sustained vitality while soothing joint pain and chronic fatigue. Just one hot cup every morning to feel your absolute best.`,
  suggestedVideoPrompt: `Cinematic close-up of premium dark coffee pouring into a minimalist ceramic mug with gentle steam rising in soft golden morning sunlight. Macro reveal of dates, whole black seeds, and purple mangosteen fruit arranged on an organic dark slate background. Camera smoothly dollies out to show an energized person stretching comfortably in a modern bright living room. 4K, 24fps commercial lighting.`,
};
