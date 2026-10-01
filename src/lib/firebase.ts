import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, GeneratedArtifact, AiImageResult, MusicTrackResult, AiVideoResult, AudioTranscriptResult } from '../types.js';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with custom database ID from config
export const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Validate connection per Firebase integration guidelines
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is offline or network restricted.");
      return false;
    }
    // Document not existing or permission denied is normal during initialization test
    return true;
  }
}

// Auth operations
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  
  // Persist user profile record to /users/{uid}
  try {
    const userDocRef = doc(firestore, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Product Manager',
      photoURL: user.photoURL || '',
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn("Could not sync user profile to Firestore (may be offline)", err);
  }

  return user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// Data persistence helpers for Firestore
export async function persistArtifactToFirestore(userId: string, artifact: GeneratedArtifact): Promise<void> {
  try {
    const artifactRef = doc(firestore, 'users', userId, 'artifacts', artifact.id);
    await setDoc(artifactRef, {
      id: artifact.id,
      userId,
      productId: artifact.productId,
      taskType: artifact.taskType,
      status: artifact.status,
      version: artifact.version,
      content: JSON.stringify(artifact.schemaData),
      renderedMarkdown: artifact.renderedMarkdown,
      metadata: artifact.metadata,
      createdAt: artifact.metadata?.createdAt || new Date().toISOString()
    });
  } catch (err) {
    console.warn("Failed to persist artifact to Firestore", err);
  }
}

export async function fetchUserArtifactsFromFirestore(userId: string): Promise<GeneratedArtifact[]> {
  try {
    const artifactsRef = collection(firestore, 'users', userId, 'artifacts');
    const q = query(artifactsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: data.id,
        requestId: data.metadata?.requestId || data.id,
        productId: data.productId,
        taskType: data.taskType,
        status: data.status,
        version: data.version,
        schemaData: data.content ? JSON.parse(data.content) : {},
        renderedMarkdown: data.renderedMarkdown || '',
        metadata: data.metadata
      } as GeneratedArtifact;
    });
  } catch (err) {
    console.warn("Could not fetch artifacts from Firestore", err);
    return [];
  }
}

export async function persistAiAssetToFirestore(
  userId: string, 
  asset: {
    id: string;
    productId: string;
    assetType: 'IMAGE' | 'VIDEO' | 'AUDIO_TRANSCRIPT' | 'MUSIC_TRACK';
    title: string;
    prompt: string;
    modelUsed: string;
    mediaUrl: string;
  }
): Promise<void> {
  try {
    const assetRef = doc(firestore, 'users', userId, 'aiAssets', asset.id);
    await setDoc(assetRef, {
      ...asset,
      userId,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Failed to persist AI asset to Firestore", err);
  }
}
