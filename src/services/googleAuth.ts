import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";
import { saveUserProfile } from "./db";

const createProvider = (customScopes?: string[]) => {
  const provider = new GoogleAuthProvider();
  // Valid, non-conflicting scopes:
  // - https://www.googleapis.com/auth/youtube covers all YouTube data, channels, video management, and video uploading.
  // - Do NOT request https://www.googleapis.com/auth/youtube.upload alongside https://www.googleapis.com/auth/youtube
  //   because Google OAuth rejects combining parent and child scopes ("scopes that cannot be requested together").
  // - Do NOT request https://www.googleapis.com/auth/drive.file alongside youtube scope to prevent cross-service scope restrictions.
  const scopes = customScopes || [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/spreadsheets",
  ];

  scopes.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: "select_account",
  });
  return provider;
};

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = await getAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem("yt_google_access_token");
      } catch {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In with popup
export const googleSignIn = async (
  requestedScopes?: string[]
): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = createProvider(requestedScopes);

    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupErr: any) {
      if (
        popupErr.code === "auth/popup-closed-by-user" ||
        popupErr.code === "auth/cancelled-popup-request"
      ) {
        throw new Error("Sign-in popup was closed before completing.");
      }
      if (popupErr.code === "auth/unauthorized-domain") {
        const domain = typeof window !== "undefined" ? window.location.hostname : "your-app.vercel.app";
        throw new Error(
          `auth/unauthorized-domain: Domain "${domain}" is not added to Firebase Authorized Domains. Add "${domain}" in Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else if (
        popupErr.message?.includes("scopes") ||
        popupErr.message?.includes("invalid_request") ||
        popupErr.code === "auth/invalid-credential"
      ) {
        const fallbackProvider = new GoogleAuthProvider();
        fallbackProvider.addScope("https://www.googleapis.com/auth/youtube");
        fallbackProvider.setCustomParameters({ prompt: "select_account" });
        result = await signInWithPopup(auth, fallbackProvider);
      } else {
        throw popupErr;
      }
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve access token from Google sign-in.");
    }
    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem("yt_google_access_token", credential.accessToken);
    } catch {}

    // Store user account information in Firestore
    if (result.user) {
      try {
        await saveUserProfile({
          uid: result.user.uid,
          email: result.user.email || "",
          displayName: result.user.displayName || (result.user.email?.split("@")[0] || "User"),
          photoURL: result.user.photoURL || "",
          emailVerified: result.user.emailVerified,
          providerId: "google.com",
          lastLoginAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[Firestore] User profile initial sync:", e);
      }
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Create new account with email, password, and custom user information
 */
export const emailSignUp = async (
  email: string,
  pass: string,
  displayName: string,
  extraInfo?: { bio?: string; channelCustomName?: string }
): Promise<User> => {
  try {
    isSigningIn = true;
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Update Firebase Auth profile display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Persist full account profile in Firestore
    await saveUserProfile({
      uid: user.uid,
      email,
      displayName: displayName || email.split("@")[0],
      bio: extraInfo?.bio || "",
      channelCustomName: extraInfo?.channelCustomName || "",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      emailVerified: user.emailVerified,
      providerId: "password",
      preferences: {
        autoplay: true,
        defaultPlaybackSpeed: 1,
        preferredCategory: "All",
        theme: "dark",
        showCaptions: false,
      },
      stats: {
        videosWatchedCount: 0,
        likedVideosCount: 0,
        watchLaterCount: 0,
      },
    });

    return user;
  } catch (err: any) {
    console.error("Email signup error:", err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign in with email and password
 */
export const emailSignIn = async (email: string, pass: string): Promise<User> => {
  try {
    isSigningIn = true;
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Update user profile in Firestore
    await saveUserProfile({
      uid: user.uid,
      email: user.email || email,
      displayName: user.displayName || email.split("@")[0],
      photoURL: user.photoURL || "",
      emailVerified: user.emailVerified,
      providerId: "password",
      lastLoginAt: new Date().toISOString(),
    });

    return user;
  } catch (err: any) {
    console.error("Email sign-in error:", err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * Update authenticated user profile and Firestore account information
 */
export const updateUserAccountProfile = async (
  user: User,
  profile: {
    displayName?: string;
    photoURL?: string;
    bio?: string;
    channelCustomName?: string;
    preferences?: any;
  }
): Promise<void> => {
  if (profile.displayName || profile.photoURL) {
    await updateProfile(user, {
      displayName: profile.displayName || user.displayName,
      photoURL: profile.photoURL || user.photoURL,
    });
  }

  await saveUserProfile({
    uid: user.uid,
    email: user.email || "",
    displayName: profile.displayName || user.displayName || "",
    photoURL: profile.photoURL || user.photoURL || "",
    bio: profile.bio || "",
    channelCustomName: profile.channelCustomName || "",
    ...(profile.preferences ? { preferences: profile.preferences } : {}),
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = sessionStorage.getItem("yt_google_access_token");
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch {}
  return null;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem("yt_google_access_token", token);
    } else {
      sessionStorage.removeItem("yt_google_access_token");
    }
  } catch {}
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem("yt_google_access_token");
  } catch {}
};
