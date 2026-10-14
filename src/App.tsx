import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { SignInModal } from './components/SignInModal.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { PrivateSpaceView } from './components/PrivateSpaceView.tsx';
import { SharedSpaceView } from './components/SharedSpaceView.tsx';
import { DeploymentGuideModal } from './components/DeploymentGuideModal.tsx';
import { ProfileSettingsModal } from './components/ProfileSettingsModal.tsx';
import { Shield, BookOpen, User, KeyRound } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'private' | 'shared'>('dashboard');
  const [privateSubTab, setPrivateSubTab] = useState<string>('money');
  const [sharedSubTab, setSharedSubTab] = useState<string>('income');
  const [quickAction, setQuickAction] = useState<
    'private-expense' | 'private-task' | 'private-note' | 'shared-income' | 'shared-plan' | null
  >(null);

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'password'>('profile');
  const [isSwitchBrotherOpen, setIsSwitchBrotherOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-bold text-xl mb-4 font-serif-title shadow-lg">
          <span className="text-emerald-400">4</span>B
        </div>
        <div className="w-8 h-8 border-3 border-white/20 border-t-emerald-400 rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-400 tracking-wider font-semibold uppercase">
          Initializing 4broters Family Hub...
        </p>
      </div>
    );
  }

  // If not authenticated or manually switching brother account
  if (!user || isSwitchBrotherOpen) {
    return (
      <>
        <SignInModal
          onOpenGuide={() => setIsGuideOpen(true)}
          onSuccess={() => setIsSwitchBrotherOpen(false)}
          onCancel={user ? () => setIsSwitchBrotherOpen(false) : undefined}
        />
        <DeploymentGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      </>
    );
  }

  const handleDashboardNavigate = (tab: 'private' | 'shared', sub?: string) => {
    setActiveTab(tab);
    if (tab === 'private' && sub) setPrivateSubTab(sub);
    if (tab === 'shared' && sub) setSharedSubTab(sub);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAction = (
    action: 'private-expense' | 'private-task' | 'private-note' | 'shared-income' | 'shared-plan'
  ) => {
    if (action.startsWith('private')) {
      setActiveTab('private');
      setQuickAction(action);
    } else {
      setActiveTab('shared');
      setQuickAction(action as any);
    }
  };

  const handleOpenProfileModal = (tab: 'profile' | 'password' = 'profile') => {
    setProfileModalTab(tab);
    setIsProfileOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Navigation */}
      <Navbar
        currentTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenProfile={handleOpenProfileModal}
        onSwitchBrotherModal={() => setIsSwitchBrotherOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={handleDashboardNavigate}
            onOpenQuickAction={handleQuickAction}
            onOpenProfile={handleOpenProfileModal}
          />
        )}

        {activeTab === 'private' && (
          <PrivateSpaceView
            initialSubTab={privateSubTab}
            defaultAction={quickAction as any}
            onClearAction={() => setQuickAction(null)}
          />
        )}

        {activeTab === 'shared' && (
          <SharedSpaceView
            initialSubTab={sharedSubTab}
            defaultAction={quickAction as any}
            onClearAction={() => setQuickAction(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 font-serif-title">4broters</span>
            <span>· Dedicated family hub for Mahmood Khan, Azhar Mahmood, Talha Mahmood & Sabaz Ali Khan</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => handleOpenProfileModal('profile')}
              className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Photo</span>
            </button>
            <button
              onClick={() => handleOpenProfileModal('password')}
              className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Database & Setup Guide</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DeploymentGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onDataChanged={() => {
          window.location.reload();
        }}
      />

      <ProfileSettingsModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        defaultTab={profileModalTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
