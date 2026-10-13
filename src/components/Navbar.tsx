import React, { useState } from 'react';
import {
  Shield,
  User,
  Users,
  LogOut,
  KeyRound,
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  Lock,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  currentTab: 'dashboard' | 'private' | 'shared';
  onTabChange: (tab: 'dashboard' | 'private' | 'shared') => void;
  onOpenGuide: () => void;
  onOpenProfile: (tab?: 'profile' | 'password') => void;
  onSwitchBrotherModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenGuide,
  onOpenProfile,
  onSwitchBrotherModal
}) => {
  const { user, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:bg-slate-800 transition-colors">
                <span className="text-emerald-400 font-serif-title text-lg">4</span>B
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight font-serif-title block leading-none">
                  4broters
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block mt-0.5">
                  Family Hub
                </span>
              </div>
            </button>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1.5 ml-4">
              <button
                onClick={() => onTabChange('dashboard')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => onTabChange('private')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  currentTab === 'private'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Private Space</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-medium tracking-tight">
                  Eyes Only
                </span>
              </button>

              <button
                onClick={() => onTabChange('shared')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  currentTab === 'shared'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Shared Family Space</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-medium tracking-tight">
                  All 4
                </span>
              </button>
            </nav>
          </div>

          {/* Right: Active Brother Profile & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGuide}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              title="Architecture and deployment guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Setup Guide</span>
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-left shadow-2xs"
              >
                <div
                  className="w-8 h-8 rounded-xl text-white text-xs font-bold flex items-center justify-center shadow-xs overflow-hidden shrink-0"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user.full_name}</p>
                  <p className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Private Session</span>
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center shadow-xs overflow-hidden shrink-0"
                        style={{ backgroundColor: user.avatar_color }}
                      >
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          user.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-slate-500 font-mono truncate">{user.email}</p>
                        {user.phone_number && (
                          <p className="text-[10px] text-emerald-700 font-mono mt-0.5 font-medium">
                            WhatsApp: {user.phone_number}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenProfile('profile');
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-semibold"
                      >
                        <User className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span>Profile & Picture & Email</span>
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Add photo, update email & WhatsApp number
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenProfile('password');
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-semibold"
                      >
                        <KeyRound className="w-4 h-4 text-amber-600" />
                        <div>
                          <span>How to Change Password</span>
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Update your personal passcode
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onSwitchBrotherModal();
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium border-t border-slate-100"
                      >
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>Switch Brother Account</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenGuide();
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium"
                      >
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        <span>Setup & Database Guide</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-semibold"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>


            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 space-y-1">
            <button
              onClick={() => {
                onTabChange('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                currentTab === 'dashboard'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </span>
            </button>

            <button
              onClick={() => {
                onTabChange('private');
                setMobileMenuOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                currentTab === 'private'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Private Space
              </span>
              <span className="text-[10px] opacity-75">Eyes Only</span>
            </button>

            <button
              onClick={() => {
                onTabChange('shared');
                setMobileMenuOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                currentTab === 'shared'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Shared Family Space
              </span>
              <span className="text-[10px] opacity-75">All Brothers</span>
            </button>

            <button
              onClick={() => {
                onOpenGuide();
                setMobileMenuOpen(false);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>Setup & Database Guide</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
