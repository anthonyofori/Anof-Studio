import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errorHandling';
import { VoiceClonePersona } from '../types';

export interface SavedScriptDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  language: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SpeechGenerationRecord {
  id: string;
  userId: string;
  title: string;
  textSnippet: string;
  voice: string;
  language: string;
  characters: number;
  createdAt: string;
}

// 1. Scripts Management
export async function saveScriptToFirestore(
  userId: string,
  script: { id?: string; title: string; content: string; language: string }
): Promise<string> {
  const scriptId = script.id || `script_${Date.now()}`;
  const path = `users/${userId}/scripts/${scriptId}`;
  const scriptRef = doc(db, 'users', userId, 'scripts', scriptId);

  const payload: SavedScriptDocument = {
    id: scriptId,
    userId,
    title: script.title.slice(0, 200),
    content: script.content.slice(0, 10000),
    language: script.language.slice(0, 50),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(scriptRef, payload);
    return scriptId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserScripts(
  userId: string,
  onUpdate: (scripts: SavedScriptDocument[]) => void
): () => void {
  const path = `users/${userId}/scripts`;
  const scriptsRef = collection(db, 'users', userId, 'scripts');

  return onSnapshot(
    scriptsRef,
    (snapshot) => {
      const items: SavedScriptDocument[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as SavedScriptDocument);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// 2. Custom Voice Clones Management
export async function saveVoiceCloneToFirestore(
  userId: string,
  clone: VoiceClonePersona
): Promise<void> {
  const path = `users/${userId}/voiceClones/${clone.id}`;
  const cloneRef = doc(db, 'users', userId, 'voiceClones', clone.id);

  const payload = {
    id: clone.id,
    userId,
    name: clone.name.slice(0, 100),
    gender: clone.gender,
    timbre: clone.timbre.slice(0, 300),
    accent: clone.accent.slice(0, 100),
    acousticProfile: clone.acousticProfile.slice(0, 500),
    recommendedBaseVoice: clone.recommendedBaseVoice,
    narrationGuidelines: clone.narrationGuidelines.slice(0, 500),
    createdAt: clone.createdAt || new Date().toISOString(),
  };

  try {
    await setDoc(cloneRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserVoiceClones(
  userId: string,
  onUpdate: (clones: VoiceClonePersona[]) => void
): () => void {
  const path = `users/${userId}/voiceClones`;
  const clonesRef = collection(db, 'users', userId, 'voiceClones');

  return onSnapshot(
    clonesRef,
    (snapshot) => {
      const items: VoiceClonePersona[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as VoiceClonePersona);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function deleteVoiceCloneFromFirestore(
  userId: string,
  cloneId: string
): Promise<void> {
  const path = `users/${userId}/voiceClones/${cloneId}`;
  const cloneRef = doc(db, 'users', userId, 'voiceClones', cloneId);

  try {
    await deleteDoc(cloneRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 3. Speech Generations History
export async function logSpeechGenerationToFirestore(
  userId: string,
  record: { title: string; textSnippet: string; voice: string; language: string; characters: number }
): Promise<void> {
  const genId = `gen_${Date.now()}`;
  const path = `users/${userId}/generations/${genId}`;
  const genRef = doc(db, 'users', userId, 'generations', genId);

  const payload: SpeechGenerationRecord = {
    id: genId,
    userId,
    title: record.title.slice(0, 200),
    textSnippet: record.textSnippet.slice(0, 500),
    voice: record.voice.slice(0, 100),
    language: record.language.slice(0, 50),
    characters: record.characters,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(genRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
