import {
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  collection,
  query,
  getDocs,
  deleteDoc,
  where,
  onSnapshot,
} from "firebase/firestore";
import { Video, UserProfile, UserPreferences, UserStats } from "../types";
import { db, auth } from "./firebase";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
  };
  console.error("[Firestore Error]", JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

/**
 * Validate connection to Firestore as mandated by Firebase architecture skill
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("[Firestore] Connection verified successfully.");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("[Firestore] Client is offline or database initializing.");
    }
    return false;
  }
}

/**
 * Store or update User Account Information in Firestore
 * Persists all profile fields, authentication details, preferences, and stats
 */
export async function saveUserProfile(
  profile: Partial<UserProfile> & { uid: string; email: string }
): Promise<void> {
  if (!profile.uid) return;
  const userRef = doc(db, "users", profile.uid);

  try {
    const dataToSave: Record<string, any> = {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName || profile.email.split("@")[0] || "User",
      photoURL: profile.photoURL || "",
      bio: profile.bio || "",
      channelCustomName: profile.channelCustomName || "",
      updatedAt: new Date().toISOString(),
    };

    if (profile.createdAt) {
      dataToSave.createdAt = profile.createdAt;
    } else {
      dataToSave.createdAt = new Date().toISOString();
    }

    if (profile.lastLoginAt) {
      dataToSave.lastLoginAt = profile.lastLoginAt;
    }

    if (profile.emailVerified !== undefined) {
      dataToSave.emailVerified = profile.emailVerified;
    }

    if (profile.providerId) {
      dataToSave.providerId = profile.providerId;
    }

    if (profile.preferences) {
      dataToSave.preferences = profile.preferences;
    }

    if (profile.stats) {
      dataToSave.stats = profile.stats;
    }

    await setDoc(userRef, dataToSave, { merge: true });
    console.log(`[Firestore] User profile stored for ${profile.uid}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
  }
}

/**
 * Retrieve User Profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.error("[Firestore] Error fetching user profile:", err);
    return null;
  }
}

/**
 * Subscribe to real-time User Profile updates from Firestore
 */
export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: UserProfile | null) => void
): () => void {
  if (!uid) return () => {};
  const userRef = doc(db, "users", uid);
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as UserProfile);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn("[Firestore] User profile subscription error:", err);
    }
  );
}

/**
 * Update user preferences in database
 */
export async function updateUserPreferences(
  uid: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  if (!uid) return;
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        preferences,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Increment video watch counter and store last watched video title in Firestore
 */
export async function incrementUserVideoWatchStats(
  uid: string,
  videoTitle: string,
  likedCount?: number,
  watchLaterCount?: number
): Promise<void> {
  if (!uid) return;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    const existingStats: UserStats = snap.exists() ? snap.data()?.stats || {} : {};

    const updatedStats: UserStats = {
      ...existingStats,
      videosWatchedCount: (existingStats.videosWatchedCount || 0) + 1,
      lastWatchedVideoTitle: videoTitle,
      ...(likedCount !== undefined ? { likedVideosCount: likedCount } : {}),
      ...(watchLaterCount !== undefined ? { watchLaterCount } : {}),
    };

    await setDoc(
      userRef,
      {
        stats: updatedStats,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("[Firestore] Failed to update video stats:", error);
  }
}

/**
 * Save video to user library (history, liked, watch later)
 */
export async function saveLibraryItemToFirestore(
  userId: string,
  type: "history" | "liked" | "watchlater",
  video: Video
): Promise<void> {
  if (!userId || !video.id) return;
  try {
    const docId = `${type}_${video.id}`;
    const itemRef = doc(db, "users", userId, "library", docId);
    await setDoc(itemRef, {
      id: docId,
      videoId: video.id,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnail: video.thumbnail,
      duration: video.duration,
      type,
      savedAt: new Date().toISOString(),
      userId,
    });
  } catch (err) {
    console.error("[Firestore] Error saving library item:", err);
  }
}

/**
 * Remove video from user library
 */
export async function removeLibraryItemFromFirestore(
  userId: string,
  type: "history" | "liked" | "watchlater",
  videoId: string
): Promise<void> {
  if (!userId || !videoId) return;
  try {
    const docId = `${type}_${videoId}`;
    await deleteDoc(doc(db, "users", userId, "library", docId));
  } catch (err) {
    console.error("[Firestore] Error removing library item:", err);
  }
}

/**
 * Clear all items of a given library type (e.g. history) for the user in Firestore
 */
export async function clearUserLibraryInFirestore(
  userId: string,
  type: "history" | "liked" | "watchlater"
): Promise<void> {
  if (!userId) return;
  try {
    const libRef = collection(db, "users", userId, "library");
    const q = query(libRef, where("type", "==", type));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error("[Firestore] Error clearing library in database:", err);
  }
}

/**
 * Fetch library items of a given type for user
 */
export async function fetchUserLibraryFromFirestore(
  userId: string,
  type: "history" | "liked" | "watchlater"
): Promise<Video[]> {
  if (!userId) return [];
  try {
    const libRef = collection(db, "users", userId, "library");
    const q = query(libRef, where("type", "==", type));
    const snapshot = await getDocs(q);
    const videos: Video[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      videos.push({
        id: data.videoId,
        title: data.title,
        channelTitle: data.channelTitle,
        thumbnail: data.thumbnail,
        duration: data.duration,
        description: "",
        publishedAt: data.savedAt || new Date().toISOString(),
        viewCount: "N/A",
        likeCount: "N/A",
      });
    });
    return videos;
  } catch (err) {
    console.error("[Firestore] Error fetching user library:", err);
    return [];
  }
}
