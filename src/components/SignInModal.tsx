import React, { useState, useEffect } from 'react';
import {
  Lock,
  Shield,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  KeyRound,
  User,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { Brother } from '../types/index.ts';

interface SignInModalProps {
  onOpenGuide: () => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DEFAULT_BROTHERS_CONFIG = [
  {
    key: 'mahmood',
    name: 'Mahmood Khan',
    email: 'mahmood@4broters.local',
    color: '#1e3a8a',
    initials: 'MK',
    phone: '03109796509',
    defaultPasscode: 'mahmood2026'
  },
  {
    key: 'azhar',
    name: 'Azhar Mahmood',
    email: 'azhar@4broters.local',
    color: '#065f46',
    initials: 'AM',
    phone: '+971 55 955 3018',
    defaultPasscode: 'azhar2026'
  },
  {
    key: 'talha',
    name: 'Talha Mahmood',
    email: 'talha@4broters.local',
    color: '#5b21b6',
    initials: 'TM',
    phone: '03255691055',
    defaultPasscode: 'talha2026'
  },
  {
    key: 'sabaz',
    name: 'Sabaz Ali Khan',
    email: 'sabaz@4broters.local',
    color: '#92400e',
    initials: 'SK',
    phone: '03159944181',
    defaultPasscode: 'sabaz2026'
  }
];

export const SignInModal: React.FC<SignInModalProps> = ({ onOpenGuide, onSuccess, onCancel }) => {
  const { user: currentUser, login } = useAuth();
  const [selectedBrotherKey, setSelectedBrotherKey] = useState<string>('mahmood');
  const [passcode, setPasscode] = useState('mahmood2026');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Brother[]>([]);
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);
  const [showCustomPasswordInput, setShowCustomPasswordInput] = useState(false);

  useEffect(() => {
    // Load current profiles to get any updated avatars, phone numbers, or emails
    api.auth.getFamilyMembers().then(setMembers).catch(() => {});
  }, []);

  const currentSelectedConfig =
    DEFAULT_BROTHERS_CONFIG.find((b) => b.key === selectedBrotherKey) || DEFAULT_BROTHERS_CONFIG[0];
  const dynamicMember = members.find((m) => m.brother_key === selectedBrotherKey);

  // 1-Click direct open for any brother
  const handleQuickOpen = async (brotherKey: string, defaultPass: string) => {
    setSelectedBrotherKey(brotherKey);
    setPasscode(defaultPass);
    setError(null);
    setLoadingKey(brotherKey);
    setLoading(true);

    try {
      await login(brotherKey, defaultPass);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      // If default passcode failed, likely brother changed password
      setShowCustomPasswordInput(true);
      setError(
        err.message?.includes('Incorrect passcode')
          ? `A custom password was set for this account. Please enter your new passcode below.`
          : err.message || 'Authentication failed. Please verify your passcode.'
      );
    } finally {
      setLoading(false);
      setLoadingKey(null);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) {
      setError('Please enter your passcode or password.');
      return;
    }

    setLoading(true);
    setLoadingKey(selectedBrotherKey);
    setError(null);
    try {
      await login(selectedBrotherKey, passcode);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your passcode.');
    } finally {
      setLoading(false);
      setLoadingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3 sm:p-4 py-8">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-900/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-900/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto">
        {/* Cancel button if already authenticated */}
        {onCancel && currentUser && (
          <div className="bg-slate-950 px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span className="truncate">Currently in session as <strong className="text-white">{currentUser.full_name}</strong></span>
            <button
              onClick={onCancel}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1 transition-colors shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-7 text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-md mb-2.5 border border-emerald-400/30 shadow-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Private Family Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif-title">4broters</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            Click any brother below to open their private & shared hub immediately
          </p>
        </div>

        {/* Brother Selector Form */}
        <div className="p-5 sm:p-7 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Select Brother to Open</span>
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                1-Click Access
              </span>
            </div>

            {/* 4 Brother Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEFAULT_BROTHERS_CONFIG.map((b) => {
                const isSelected = selectedBrotherKey === b.key;
                const isThisLoading = loading && loadingKey === b.key;
                const liveMember = members.find((m) => m.brother_key === b.key);
                const avatarImg = liveMember?.avatar_url || null;
                const displayName = liveMember?.full_name || b.name;
                const phoneDisplay = liveMember?.phone_number || b.phone;

                return (
                  <div
                    key={b.key}
                    className={`relative p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs overflow-hidden"
                        style={{ backgroundColor: b.color }}
                      >
                        {avatarImg ? (
                          <img src={avatarImg} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          b.initials
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                          {displayName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{phoneDisplay}</p>
                      </div>
                    </div>

                    {/* Instant Open Action Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickOpen(b.key, b.defaultPasscode)}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                          isSelected
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isThisLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Opening...</span>
                          </>
                        ) : (
                          <>
                            <span>Open Hub</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        title="Enter custom password"
                        onClick={() => {
                          setSelectedBrotherKey(b.key);
                          setPasscode(b.defaultPasscode);
                          setShowCustomPasswordInput(true);
                          setError(null);
                        }}
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 bg-white transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Authentication Note:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Optional: Enter Custom Password Accordion */}
          {showCustomPasswordInput ? (
            <form onSubmit={handleManualLogin} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Passcode for {dynamicMember?.full_name || currentSelectedConfig.name}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPasscode(currentSelectedConfig.defaultPasscode)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Use default ({currentSelectedConfig.defaultPasscode})
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter custom passcode"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>Login with this Passcode</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Changed your password?</span>
              <button
                type="button"
                onClick={() => setShowCustomPasswordInput(true)}
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
              >
                <KeyRound className="w-3 h-3" />
                <span>Enter custom password</span>
              </button>
            </div>
          )}

          {/* How to change password quick helper */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-indigo-900 text-xs">
                <KeyRound className="w-3.5 h-3.5 text-indigo-700" />
                <span>How to change your password:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPasswordGuide(!showPasswordGuide)}
                className="text-[11px] text-indigo-700 font-bold hover:underline"
              >
                {showPasswordGuide ? 'Hide Info' : 'View Instructions'}
              </button>
            </div>
            {showPasswordGuide ? (
              <p className="text-[11px] text-indigo-900/90 leading-relaxed pt-1.5 border-t border-indigo-200/60">
                1. Click <strong>Open Hub</strong> on your brother card above to sign in.<br />
                2. In your dashboard, click your profile in the top-right corner and choose <strong>"How to Change Password"</strong>.<br />
                3. Enter your current passcode (e.g. <code>mahmood2026</code>, <code>azhar2026</code>, <code>talha2026</code>, <code>sabaz2026</code>), type your new password, and click save.
              </p>
            ) : (
              <p className="text-[11px] text-indigo-800/80">
                Default passcodes: <code>mahmood2026</code> · <code>azhar2026</code> · <code>talha2026</code> · <code>sabaz2026</code>. Click any brother above to enter.
              </p>
            )}
          </div>

          {/* Privacy footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Private & Shared Spaces</span>
            </span>
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Setup Guide</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
