import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  Shield,
  MessageCircle,
  HelpCircle,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Send,
  Camera,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api, getWhatsAppUrl } from '../lib/api.ts';
import { compressAvatarImage } from '../lib/imageCompressor.ts';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'profile' | 'password';
}

// Preset photo options if brothers want quick avatars
const AVATAR_PRESETS = [
  { label: 'Executive', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { label: 'Warm smile', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { label: 'Creative', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { label: 'Smart casual', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { label: 'Modern', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { label: 'Classic', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' }
];

const OFFICIAL_PHONE_NUMBERS: Record<string, { name: string; phone: string; defaultPass: string }> = {
  mahmood: { name: 'Mahmood Khan', phone: '03109796509', defaultPass: 'mahmood2026' },
  azhar: { name: 'Azhar Mahmood', phone: '+971 55 955 3018', defaultPass: 'azhar2026' },
  talha: { name: 'Talha Mahmood', phone: '03255691055', defaultPass: 'talha2026' },
  sabaz: { name: 'Sabaz Ali Khan', phone: '03159944181', defaultPass: 'sabaz2026' }
};

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'profile'
}) => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>(defaultTab);

  // Profile fields state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setActiveTab(defaultTab);
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phone_number || OFFICIAL_PHONE_NUMBERS[user.brother_key]?.phone || '');
      setAvatarUrl(user.avatar_url || null);
      setProfileError(null);
      setPasswordError(null);
      setProfileSuccess(false);
      setPasswordSuccess(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, user, defaultTab]);

  if (!isOpen || !user) return null;

  const officialInfo = OFFICIAL_PHONE_NUMBERS[user.brother_key];

  // Handle image upload with auto-compression for permanent mobile sync
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please upload a valid image file (PNG, JPG, WebP, HEIC).');
      return;
    }

    try {
      setCompressing(true);
      setProfileError(null);
      // Auto-compress and square crop avatar to ~30-50KB for instantaneous upload & permanent multi-device sync
      const optimizedUrl = await compressAvatarImage(file, 480, 0.88);
      setAvatarUrl(optimizedUrl);
    } catch (err: any) {
      setProfileError('Failed to process image: ' + (err.message || 'Please try another photo.'));
    } finally {
      setCompressing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
        avatar_url: avatarUrl
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile picture and details.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
      }, 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const testWaUrl = phoneNumber ? getWhatsAppUrl(phoneNumber, `Assalamu Alaikum ${user.full_name}! This is a test notification from the 4 Brothers Family Hub. Automated WhatsApp alerts for assigned tasks are active.`) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xs overflow-hidden shrink-0"
              style={{ backgroundColor: user.avatar_color }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                user.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif-title">
                Account & Profile Settings
              </h3>
              <p className="text-xs text-slate-500">
                Change password, add profile photo, update email & WhatsApp notifications.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 px-6 bg-white gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile Photo, Email & WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'password'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>How to Change Password</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              {profileError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 font-medium shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-emerald-950">Profile picture & details permanently saved!</p>
                    <p className="text-[11px] text-emerald-800">Your new photo is stored in the database and will appear whenever you open the app on other mobiles or computers.</p>
                  </div>
                </div>
              )}

              {/* 1. Profile Picture Section */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Profile Picture Option
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Permanent Multi-Device Sync
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm overflow-hidden shrink-0 relative border-2 border-white ring-2 ring-slate-200"
                    style={{ backgroundColor: user.avatar_color }}
                  >
                    {compressing ? (
                      <div className="flex flex-col items-center justify-center gap-1 text-[10px] text-white bg-slate-900/70 absolute inset-0">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span>
                        {fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5">
                    {/* Hidden inputs: one for gallery/files, one for direct mobile camera */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={cameraInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      capture="user"
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={compressing}
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Take Photo</span>
                      </button>

                      <button
                        type="button"
                        disabled={compressing}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                      >
                        {compressing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{compressing ? 'Optimizing...' : 'Upload from Phone/PC'}</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl(null)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Photos are automatically optimized and permanently stored in your account so they immediately show on your phone, tablet, and brothers' devices.
                    </p>
                  </div>
                </div>

                {/* Quick Avatar Presets */}
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Or choose a sample avatar photo:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all shrink-0 hover:scale-105 ${
                          avatarUrl === preset.url
                            ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                        title={preset.label}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional direct URL input */}
                <div className="pt-2 border-t border-slate-200/60">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Or paste direct image URL:
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/my-photo.jpg"
                    value={avatarUrl?.startsWith('http') ? avatarUrl : ''}
                    onChange={(e) => setAvatarUrl(e.target.value.trim() || null)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  />
                </div>
              </div>

              {/* 2. Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Brother Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Address Option
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="brother@example.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 3. WhatsApp Notification Phone Number */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-700" />
                    <span>WhatsApp Phone Number (Automated Alerts)</span>
                  </label>
                  <span className="text-[10px] text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                    4 Brothers WhatsApp Hook
                  </span>
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 03255691055 or +971 55 955 3018"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-emerald-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white text-slate-900"
                  />
                </div>

                {officialInfo && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                    <span className="text-emerald-900">
                      Standard number on file: <strong className="font-mono">{officialInfo.phone}</strong>
                    </span>
                    {phoneNumber !== officialInfo.phone && (
                      <button
                        type="button"
                        onClick={() => setPhoneNumber(officialInfo.phone)}
                        className="text-emerald-700 hover:text-emerald-900 font-bold underline"
                      >
                        Reset to {officialInfo.phone}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60">
                  <p className="text-[11px] text-emerald-900/80 leading-relaxed max-w-sm">
                    Whenever any brother assigns you a task, the system triggers an automatic WhatsApp notification with details and due date to this number.
                  </p>

                  {testWaUrl && (
                    <a
                      href={testWaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>Test WhatsApp Alert</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <div className="space-y-6">
              {/* How to Change Password Help Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-indigo-900">
                    <KeyRound className="w-4 h-4 text-indigo-700" />
                    <span>How to Change Your Passcode / Password</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200/60 text-indigo-900">
                    Private Vault Security
                  </span>
                </div>

                <div className="text-indigo-900/90 leading-relaxed space-y-1.5">
                  <p className="font-semibold">Follow these simple steps to set your new private passcode:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Enter your <strong>current passcode</strong> in box #1 below. (If you have never changed it, your default passcode is <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono font-bold text-indigo-950">{officialInfo?.defaultPass || user.brother_key + '2026'}</code>).</li>
                    <li>Type your <strong>new secret passcode or password</strong> in box #2 (minimum 6 characters).</li>
                    <li>Re-type your new password in box #3 to verify and prevent typing mistakes.</li>
                    <li>Click <strong>Update Password</strong>. Your private vault will instantly lock with your new password!</li>
                  </ol>
                </div>

                <div className="pt-2 border-t border-indigo-200/60 flex items-center gap-2 text-[11px] text-indigo-800">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Your password is protected by PBKDF2 cryptography with server-side salting. No other brother or administrator can see it.
                  </span>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Password changed successfully! You can now use your new passcode to sign in.</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* 1. Current Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      1. Current Passcode / Password
                    </label>
                    {officialInfo && (
                      <button
                        type="button"
                        onClick={() => setCurrentPassword(officialInfo.defaultPass)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Insert default ({officialInfo.defaultPass})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password or default"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 2. New Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    2. New Secret Password (Min 6 Characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new secret password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 3. Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    3. Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type your new password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
