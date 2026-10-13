import React, { useState, useEffect } from 'react';
import { Lock, Shield, ArrowRight, AlertCircle, HelpCircle, Eye, EyeOff, KeyRound, MessageCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { Brother } from '../types/index.ts';

interface SignInModalProps {
  onOpenGuide: () => void;
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

export const SignInModal: React.FC<SignInModalProps> = ({ onOpenGuide }) => {
  const { login } = useAuth();
  const [selectedBrotherKey, setSelectedBrotherKey] = useState<string>('mahmood');
  const [passcode, setPasscode] = useState('mahmood2026');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Brother[]>([]);
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);

  useEffect(() => {
    // Load current profiles to get any updated avatars or emails
    api.auth.getFamilyMembers().then(setMembers).catch(() => {});
  }, []);

  const currentSelectedConfig = DEFAULT_BROTHERS_CONFIG.find((b) => b.key === selectedBrotherKey) || DEFAULT_BROTHERS_CONFIG[0];
  const dynamicMember = members.find((m) => m.brother_key === selectedBrotherKey);

  const handleBrotherSelect = (key: string, defaultPass: string) => {
    setSelectedBrotherKey(key);
    setPasscode(defaultPass);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) {
      setError('Please enter your passcode or password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(selectedBrotherKey, passcode);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your passcode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-900/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-900/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white p-7 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-semibold backdrop-blur-md mb-3 border border-white/10">
            <Shield className="w-3.5 h-3.5" />
            <span>Private Family Portal</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight font-serif-title">4broters</h1>
          <p className="text-slate-300 text-xs mt-1">
            Personal & Shared Hub for Mahmood Khan, Azhar Mahmood, Talha Mahmood & Sabaz Ali Khan
          </p>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleLogin} className="p-7 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Select Your Brother Account
              </label>
              <span className="text-[11px] text-slate-400">Restricted Family Access</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {DEFAULT_BROTHERS_CONFIG.map((b) => {
                const isSelected = selectedBrotherKey === b.key;
                const liveMember = members.find((m) => m.brother_key === b.key);
                const avatarImg = liveMember?.avatar_url || null;
                const displayName = liveMember?.full_name || b.name;

                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => handleBrotherSelect(b.key, b.defaultPasscode)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 text-slate-700'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden"
                      style={{ backgroundColor: b.color }}
                    >
                      {avatarImg ? (
                        <img src={avatarImg} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        b.initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                        {displayName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{b.phone}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Enter Passcode for {dynamicMember?.full_name || currentSelectedConfig.name}
              </label>
              <button
                type="button"
                onClick={() => setPasscode(currentSelectedConfig.defaultPasscode)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                Use default ({currentSelectedConfig.defaultPasscode})
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPasscode ? 'text' : 'password'}
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode or password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* How to change password quick helper */}
          <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-indigo-900 text-[11px]">
                <KeyRound className="w-3.5 h-3.5 text-indigo-700" />
                <span>How to change your password:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPasswordGuide(!showPasswordGuide)}
                className="text-[11px] text-indigo-700 font-semibold hover:underline"
              >
                {showPasswordGuide ? 'Hide Info' : 'View Instructions'}
              </button>
            </div>
            {showPasswordGuide ? (
              <p className="text-[11px] text-indigo-900/90 leading-relaxed pt-1 border-t border-indigo-200/50">
                Sign in using your account above. Once in your dashboard, click your profile in the top-right corner and select <strong>"How to Change Password"</strong>. You can enter your current password, type your new private password, and save it immediately.
              </p>
            ) : (
              <p className="text-[11px] text-indigo-800/80">
                Sign in to customize your password, email, and photo in Profile Settings.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Enter Private & Shared Hub</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* WhatsApp and privacy footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Strict RLS Privacy Enabled</span>
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
        </form>
      </div>
    </div>
  );
};
