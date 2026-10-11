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
import { UserProfile, GeneratedArtifact, AiImageResult, MusicTrackResult, AiVideoResult, AudioTranscriptResult, ArtifactComment, Product } from '../types.js';

// Export configured database ID
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';

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

export async function persistCommentToFirestore(userId: string, comment: ArtifactComment): Promise<void> {
  try {
    const commentRef = doc(firestore, 'users', userId, 'artifacts', comment.artifactId, 'comments', comment.id);
    await setDoc(commentRef, {
      ...comment,
      userId,
      syncedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Failed to persist comment to Firestore", err);
  }
}

export async function fetchCommentsFromFirestore(userId: string, artifactId: string): Promise<ArtifactComment[]> {
  try {
    const commentsRef = collection(firestore, 'users', userId, 'artifacts', artifactId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ArtifactComment);
  } catch (err) {
    console.warn("Could not fetch comments from Firestore", err);
    return [];
  }
}

export async function updateCommentInFirestore(userId: string, artifactId: string, commentId: string, updates: Partial<ArtifactComment>): Promise<void> {
  try {
    const commentRef = doc(firestore, 'users', userId, 'artifacts', artifactId, 'comments', commentId);
    await setDoc(commentRef, updates, { merge: true });
  } catch (err) {
    console.warn("Could not update comment in Firestore", err);
  }
}

export async function persistProductToFirestore(userId: string, product: Product): Promise<void> {
  try {
    const productRef = doc(firestore, 'users', userId, 'products', product.id);
    await setDoc(productRef, {
      ...product,
      userId,
      syncedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Could not persist product to Firestore", err);
  }
}

export async function fetchUserProductsFromFirestore(userId: string): Promise<Product[]> {
  try {
    const productsRef = collection(firestore, 'users', userId, 'products');
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as Product);
  } catch (err) {
    console.warn("Could not fetch products from Firestore", err);
    return [];
  }
}

export async function syncFullWorkspaceToFirestore(
  userId: string, 
  products: Product[], 
  artifacts: GeneratedArtifact[]
): Promise<{ productsSynced: number; artifactsSynced: number }> {
  let productsSynced = 0;
  let artifactsSynced = 0;

  for (const prod of products) {
    try {
      await persistProductToFirestore(userId, prod);
      productsSynced++;
    } catch (e) {
      console.warn("Failed syncing product", prod.id, e);
    }
  }

  for (const art of artifacts) {
    try {
      await persistArtifactToFirestore(userId, art);
      artifactsSynced++;
    } catch (e) {
      console.warn("Failed syncing artifact", art.id, e);
    }
  }

  return { productsSynced, artifactsSynced };
}

