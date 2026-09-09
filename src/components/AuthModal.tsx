import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Database,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit3,
  LogOut,
  Sparkles,
  Eye,
  EyeOff,
  Heart,
  Clock,
  FolderHeart,
  Copy,
  Check,
  SlidersHorizontal,
  Code,
  Globe,
  Radio,
  ExternalLink,
} from "lucide-react";
import {
  emailSignIn,
  emailSignUp,
  resetPassword,
  updateUserAccountProfile,
  googleSignIn,
  logout,
} from "../services/googleAuth";
import { getUserProfile, saveUserProfile, updateUserPreferences } from "../services/db";
import { UserProfile, UserPreferences } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onAuthSuccess: (user: User) => void;
  likedCount?: number;
  historyCount?: number;
  watchLaterCount?: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onAuthSuccess,
  likedCount = 0,
  historyCount = 0,
  watchLaterCount = 0,
}) => {
  const [mode, setMode] = useState<"signin" | "signup" | "profile" | "reset">("signin");
  const [profileTab, setProfileTab] = useState<"overview" | "edit" | "preferences" | "raw">("overview");

  // Authentication form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [channelCustomName, setChannelCustomName] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  // Preferences fields
  const [autoplay, setAutoplay] = useState(true);
  const [defaultPlaybackSpeed, setDefaultPlaybackSpeed] = useState<number>(1);
  const [preferredCategory, setPreferredCategory] = useState("All");
  const [showCaptions, setShowCaptions] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Firestore profile state for signed-in user
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Reset fields when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      if (user) {
        setMode("profile");
        loadProfile(user.uid);
      } else {
        setMode("signin");
      }
    }
  }, [isOpen, user]);

  const loadProfile = async (uid: string) => {
    try {
      const data = await getUserProfile(uid);
      if (data) {
        setProfile(data);
        setDisplayName(data.displayName || "");
        setBio(data.bio || "");
        setChannelCustomName(data.channelCustomName || "");
        setPhotoURL(data.photoURL || "");
        if (data.preferences) {
          setAutoplay(data.preferences.autoplay ?? true);
          setDefaultPlaybackSpeed(data.preferences.defaultPlaybackSpeed ?? 1);
          setPreferredCategory(data.preferences.preferredCategory ?? "All");
          setShowCaptions(data.preferences.showCaptions ?? false);
        }
      } else if (user) {
        setDisplayName(user.displayName || user.email?.split("@")[0] || "");
        setPhotoURL(user.photoURL || "");
      }
    } catch (e) {
      console.error("Error loading profile:", e);
    }
  };

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }
    setLoading(true);
    try {
      const authedUser = await emailSignIn(email.trim(), password);
      setSuccessMessage("Signed in successfully!");
      onAuthSuccess(authedUser);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      const msg = err.code || err.message;
      if (
        msg.includes("user-not-found") ||
        msg.includes("wrong-password") ||
        msg.includes("invalid-credential")
      ) {
        setError("Invalid email or password. Please check your credentials.");
      } else if (msg.includes("invalid-email")) {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const authedUser = await emailSignUp(email.trim(), password, displayName.trim(), {
        bio: bio.trim(),
        channelCustomName: channelCustomName.trim(),
      });
      setSuccessMessage("Account created and stored in Firestore database!");
      onAuthSuccess(authedUser);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      const msg = err.code || err.message;
      if (msg.includes("email-already-in-use")) {
        setError("This email address is already registered. Please sign in instead.");
      } else if (msg.includes("weak-password")) {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (msg.includes("invalid-email")) {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Account creation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccessMessage("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Could not send reset email. Please verify your address.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleQuickSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setSuccessMessage("Google account connected & user information stored in database!");
        onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err: any) {
      if (!err.message?.includes("closed before completing")) {
        setError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const updatedPreferences: UserPreferences = {
        autoplay,
        defaultPlaybackSpeed,
        preferredCategory,
        showCaptions,
      };

      await updateUserAccountProfile(user, {
        displayName: displayName.trim(),
        photoURL: photoURL.trim(),
        bio: bio.trim(),
        channelCustomName: channelCustomName.trim(),
        preferences: updatedPreferences,
      });

      setSuccessMessage("All user information updated and saved in Firestore database!");
      setProfileTab("overview");
      loadProfile(user.uid);
    } catch (err: any) {
      setError(err.message || "Failed to update user profile in database.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferencesDirectly = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updatedPrefs: UserPreferences = {
        autoplay,
        defaultPlaybackSpeed,
        preferredCategory,
        showCaptions,
      };
      await updateUserPreferences(user.uid, updatedPrefs);
      setSuccessMessage("Preferences saved to Cloud Firestore!");
      loadProfile(user.uid);
    } catch (err: any) {
      setError("Failed to save preferences.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleCopyRawData = () => {
    if (profile) {
      navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logout();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-stone-800/80 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-500">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                {user
                  ? "User Account & Database Profile"
                  : mode === "signup"
                  ? "Create User Account"
                  : mode === "reset"
                  ? "Reset Account Password"
                  : "Sign In to Account"}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Firestore Database: Persistent User Storage</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-red-950/70 border border-red-800/80 rounded-xl flex flex-col gap-2.5 text-xs text-red-300 animate-fade-in shadow-md">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="flex-1 font-medium">{error}</span>
            </div>

            {error.includes("unauthorized-domain") && (
              <div className="pt-2 border-t border-red-900/60 text-[11px] text-red-200/90 space-y-2">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>How to authorize this domain in Firebase Console (1 minute):</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-stone-300">
                  <li>
                    Open Firebase Console:{" "}
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0124649179/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-amber-300 hover:text-white font-semibold inline-flex items-center gap-1"
                    >
                      Authentication &gt; Settings &gt; Authorized domains
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Click <strong>&quot;Add domain&quot;</strong></li>
                  <li className="flex items-center gap-2 flex-wrap">
                    <span>Paste your current domain:</span>
                    <code className="bg-black/60 px-2 py-0.5 rounded text-amber-300 font-mono text-[11px] border border-stone-800">
                      {typeof window !== "undefined" ? window.location.hostname : "your-app.vercel.app"}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(window.location.hostname);
                          setCopiedDomain(true);
                          setTimeout(() => setCopiedDomain(false), 2000);
                        }
                      }}
                      className="px-2 py-0.5 bg-amber-900/80 hover:bg-amber-800 border border-amber-700/60 text-white rounded text-[10px] font-medium transition-colors inline-flex items-center gap-1"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? "Copied!" : "Copy Domain"}</span>
                    </button>
                  </li>
                  <li>Click <strong>Save</strong>. Google sign-in will start working immediately!</li>
                </ol>
                <div className="bg-stone-900/80 border border-stone-800 rounded-lg p-2 text-[11px] text-stone-300">
                  <strong className="text-white">Quick Alternative:</strong> You can create and log into your account using <strong>Email &amp; Password</strong> below right away without domain setup!
                </div>
              </div>
            )}
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="flex-1">{successMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* USER SIGNED IN: COMPLETE DATABASE PROFILE & STORED INFORMATION */}
          {user ? (
            <div className="space-y-5">
              {/* Profile Sub-Tabs */}
              <div className="flex p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs">
                <button
                  type="button"
                  onClick={() => setProfileTab("overview")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    profileTab === "overview"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("edit")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    profileTab === "edit"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("preferences")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    profileTab === "preferences"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Preferences
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("raw")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    profileTab === "raw"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  DB JSON
                </button>
              </div>

              {/* TAB 1: OVERVIEW */}
              {profileTab === "overview" && (
                <div className="space-y-4">
                  {/* Account Card */}
                  <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl flex items-start gap-3.5">
                    {profile?.photoURL || user.photoURL ? (
                      <img
                        src={profile?.photoURL || user.photoURL || ""}
                        alt="Avatar"
                        className="w-14 h-14 rounded-full object-cover border-2 border-red-500/50 shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 font-bold text-lg shrink-0">
                        {(profile?.displayName || user.displayName || user.email || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">
                          {profile?.displayName || user.displayName || "Registered User"}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-semibold">
                          Database Synced
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 truncate mt-0.5">{user.email}</p>
                      {profile?.channelCustomName && (
                        <p className="text-[11px] text-red-400 font-medium truncate mt-0.5">
                          Channel: @{profile.channelCustomName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stored User Information Grid */}
                  <div className="p-4 bg-stone-950/70 border border-stone-800/90 rounded-xl space-y-2.5 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5 border-b border-stone-800 pb-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                      <span>Stored User Account Credentials</span>
                    </div>

                    <div className="flex items-center justify-between text-stone-300">
                      <span className="text-stone-500">Firestore User ID:</span>
                      <div className="flex items-center gap-1.5">
                        <code className="bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded text-[11px] text-stone-300 font-mono">
                          {user.uid.slice(0, 14)}...
                        </code>
                        <button
                          onClick={handleCopyUid}
                          className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-white transition-colors"
                          title="Copy Full UID"
                        >
                          {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-stone-300">
                      <span className="text-stone-500">Auth Provider:</span>
                      <span className="capitalize font-medium text-stone-200">
                        {profile?.providerId || user.providerData?.[0]?.providerId || "Google OAuth"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-stone-300">
                      <span className="text-stone-500">Account Created:</span>
                      <span className="text-stone-300">
                        {profile?.createdAt
                          ? new Date(profile.createdAt).toLocaleDateString()
                          : "Active"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-stone-300">
                      <span className="text-stone-500">Last Database Sync:</span>
                      <span className="text-stone-300">
                        {profile?.lastLoginAt
                          ? new Date(profile.lastLoginAt).toLocaleTimeString()
                          : "Just now"}
                      </span>
                    </div>
                  </div>

                  {/* Database Library & Activity Stats */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl text-center">
                      <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">
                        {profile?.stats?.videosWatchedCount || historyCount}
                      </div>
                      <div className="text-[10px] text-stone-400">Watched in DB</div>
                    </div>
                    <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl text-center">
                      <Heart className="w-4 h-4 text-pink-400 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">
                        {likedCount}
                      </div>
                      <div className="text-[10px] text-stone-400">Liked in DB</div>
                    </div>
                    <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl text-center">
                      <FolderHeart className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">
                        {watchLaterCount}
                      </div>
                      <div className="text-[10px] text-stone-400">Watch Later</div>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile?.bio && (
                    <div className="p-3.5 bg-stone-950/60 border border-stone-800/80 rounded-xl text-xs text-stone-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                        Creator Bio
                      </span>
                      <p className="leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setProfileTab("edit")}
                      className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Information</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      disabled={loading}
                      className="px-4 py-2 bg-stone-800 hover:bg-red-950/40 text-stone-300 hover:text-red-400 border border-stone-700 hover:border-red-800/50 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: EDIT PROFILE */}
              {profileTab === "edit" && (
                <form onSubmit={handleUpdateProfile} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Full Name / Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Custom Channel Handle / Alias
                    </label>
                    <input
                      type="text"
                      value={channelCustomName}
                      onChange={(e) => setChannelCustomName(e.target.value)}
                      placeholder="e.g. CodeCraftStudios"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Bio / About Information (Stored in DB)
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="Share a brief note or channel description..."
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Avatar Photo URL
                    </label>
                    <input
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save All to Database"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileTab("overview")}
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: PREFERENCES STORED IN DATABASE */}
              {profileTab === "preferences" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-xl space-y-3 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5 border-b border-stone-800 pb-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-red-400" />
                      <span>Playback & Interface Settings (Firestore Persisted)</span>
                    </div>

                    {/* Autoplay Toggle */}
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <div className="font-medium text-stone-200">Autoplay Next Video</div>
                        <div className="text-[10px] text-stone-500">Automatically start next recommended video</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoplay}
                        onChange={(e) => setAutoplay(e.target.checked)}
                        className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* Default Speed */}
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <div className="font-medium text-stone-200">Default Playback Speed</div>
                        <div className="text-[10px] text-stone-500">Preset player speed on startup</div>
                      </div>
                      <select
                        value={defaultPlaybackSpeed}
                        onChange={(e) => setDefaultPlaybackSpeed(Number(e.target.value))}
                        className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-stone-200 text-xs focus:outline-none focus:border-red-500"
                      >
                        <option value={0.75}>0.75x</option>
                        <option value={1}>1.0x (Normal)</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2}>2.0x</option>
                      </select>
                    </div>

                    {/* Preferred Category */}
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <div className="font-medium text-stone-200">Default Video Category</div>
                        <div className="text-[10px] text-stone-500">Initial home feed category</div>
                      </div>
                      <select
                        value={preferredCategory}
                        onChange={(e) => setPreferredCategory(e.target.value)}
                        className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-stone-200 text-xs focus:outline-none focus:border-red-500"
                      >
                        <option value="All">All Categories</option>
                        <option value="Coding & Tech">Coding & Tech</option>
                        <option value="Music">Music</option>
                        <option value="Education">Education</option>
                        <option value="Gaming">Gaming</option>
                        <option value="AI & Machine Learning">AI & Machine Learning</option>
                        <option value="Podcasts">Podcasts</option>
                      </select>
                    </div>

                    {/* Captions */}
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <div className="font-medium text-stone-200">Closed Captions (CC)</div>
                        <div className="text-[10px] text-stone-500">Enable subtitles by default</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={showCaptions}
                        onChange={(e) => setShowCaptions(e.target.checked)}
                        className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSavePreferencesDirectly}
                    disabled={loading}
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Preferences to Database"}
                  </button>
                </div>
              )}

              {/* TAB 4: RAW FIRESTORE DOCUMENT INSPECTOR */}
              {profileTab === "raw" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-mono text-[11px]">
                      Collection: /users/{user.uid}
                    </span>
                    <button
                      onClick={handleCopyRawData}
                      className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs transition-colors"
                    >
                      {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRaw ? "Copied" : "Copy JSON"}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-[11px] text-emerald-400 font-mono overflow-x-auto max-h-60">
                    {JSON.stringify(profile || { uid: user.uid, email: user.email }, null, 2)}
                  </pre>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    This document is stored persistently in Cloud Firestore (<code className="text-stone-400">ai-studio-youtubeenhanced-16c8204b-d8af-4896-b5e2-b11281febb70</code>) with security rules enforcing owner-only read/write access.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* NOT SIGNED IN: EMAIL / PASSWORD / SIGNUP / GOOGLE */
            <div>
              {/* Tab Switcher */}
              {mode !== "reset" && (
                <div className="flex p-1 bg-stone-950 rounded-xl border border-stone-800 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      mode === "signin"
                        ? "bg-red-600 text-white shadow-sm"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      mode === "signup"
                        ? "bg-red-600 text-white shadow-sm"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Google Sign-in Fast Option */}
              {mode !== "reset" && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handleGoogleQuickSignIn}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 rounded-xl text-xs font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-stone-800"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-stone-900 px-2 text-stone-500 font-medium">Or with Email & Password</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form: Sign In */}
              {mode === "signin" && (
                <form onSubmit={handleSignIn} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-stone-300">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("reset");
                          setError(null);
                        }}
                        className="text-[11px] text-red-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-9 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-stone-500 hover:text-stone-300"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md disabled:opacity-50 mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In to Account"}
                  </button>
                </form>
              )}

              {/* Form: Create Account with all user information */}
              {mode === "signup" && (
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Display Name / Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full pl-8 pr-2 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Confirm</label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter"
                          className="w-full pl-8 pr-2 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Bio / User Information (Stored in Database)
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      placeholder="e.g. YouTube creator & researcher interested in tech, science & coding..."
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Custom Channel Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={channelCustomName}
                      onChange={(e) => setChannelCustomName(e.target.value)}
                      placeholder="e.g. Nexus Media"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md disabled:opacity-50 mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account & Save to Database"}
                  </button>
                </form>
              )}

              {/* Form: Reset Password */}
              {mode === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <p className="text-xs text-stone-400">
                    Enter the email associated with your account and we will send a password reset link.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
