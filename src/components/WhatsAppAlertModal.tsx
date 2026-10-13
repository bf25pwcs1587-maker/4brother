import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  Send,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { getWhatsAppUrl } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface WhatsAppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  assignedToName: string;
  assignedToPhone?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  description?: string;
  createdByName?: string;
}

const DEFAULT_BROTHER_PHONES: Record<string, string> = {
  talha: '03255691055',
  mahmood: '03109796509',
  azhar: '+971 55 955 3018',
  sabaz: '03159944181'
};

function resolveBrotherPhone(name: string, fallbackPhone?: string | null): string | null {
  if (fallbackPhone && fallbackPhone.trim()) return fallbackPhone.trim();
  const lower = (name || '').toLowerCase().trim();
  if (lower.includes('talha')) return DEFAULT_BROTHER_PHONES.talha;
  if (lower.includes('azhar')) return DEFAULT_BROTHER_PHONES.azhar;
  if (lower.includes('sabaz')) return DEFAULT_BROTHER_PHONES.sabaz;
  if (lower.includes('mahmood')) return DEFAULT_BROTHER_PHONES.mahmood;
  return null;
}

export const WhatsAppAlertModal: React.FC<WhatsAppAlertModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  assignedToName,
  assignedToPhone,
  dueDate,
  dueTime,
  description,
  createdByName
}) => {
  const { familyMembers, user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sender = createdByName || user?.full_name || 'Your Brother';

  // Construct standard formatted message
  const composeMessage = (recipientName: string) => {
    return `Assalamu Alaikum ${recipientName}!\nYou have been assigned a task on 4broters:\n\n📋 Task: ${taskTitle}\n${
      dueDate ? `📅 Due Date: ${dueDate} ${dueTime || ''}\n` : ''
    }👤 Assigned by: ${sender}\n${
      description ? `📝 Details: ${description}\n` : ''
    }\nCheck 4broters Family Hub to view & update.`;
  };

  const isAllBrothers = assignedToName === 'All Brothers' || !assignedToName;

  // Find recipient phone if not provided directly
  let targetPhone = assignedToPhone;
  if (!targetPhone && !isAllBrothers) {
    const member = familyMembers.find((m) => m.full_name === assignedToName);
    targetPhone = member?.phone_number || resolveBrotherPhone(assignedToName, null);
  } else if (!targetPhone) {
    targetPhone = resolveBrotherPhone(assignedToName, null);
  }

  const primaryMessage = composeMessage(assignedToName);
  const primaryWaUrl = targetPhone ? getWhatsAppUrl(targetPhone, primaryMessage) : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <MessageCircle className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-serif-title">WhatsApp Task Notification</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                  Automated Alert
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Notify brother via WhatsApp about this task assignment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700 overflow-y-auto max-h-[75vh]">
          {/* Target Recipient Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                Assigned Recipient
              </span>
              <span className="font-semibold text-emerald-900 text-sm">
                {assignedToName}
              </span>
            </div>

            {targetPhone ? (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/60">
                <span className="text-slate-600">WhatsApp Number:</span>
                <span className="font-mono font-bold text-emerald-900">{targetPhone}</span>
              </div>
            ) : !isAllBrothers ? (
              <div className="text-[11px] text-amber-700 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>No phone number configured for {assignedToName}.</span>
              </div>
            ) : null}
          </div>

          {/* Pre-formatted Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase tracking-wider text-slate-600 text-[11px]">
                Formatted WhatsApp Message
              </label>
              <button
                type="button"
                onClick={() => handleCopy(primaryMessage)}
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {primaryMessage}
            </pre>
          </div>

          {/* Single recipient launch button */}
          {!isAllBrothers && primaryWaUrl && (
            <div>
              <a
                href={primaryWaUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send via WhatsApp to {assignedToName} ({targetPhone})</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                Opens WhatsApp on your phone or WhatsApp Web automatically with the pre-filled message.
              </p>
            </div>
          )}

          {/* If assigned to All Brothers: provide quick WhatsApp links for each brother */}
          {isAllBrothers && (
            <div className="space-y-3 pt-1">
              <p className="font-bold text-slate-900 text-xs">
                Task is assigned to All Brothers. Click below to send alert to any brother:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { name: 'Talha Mahmood', phone: '03255691055' },
                  { name: 'Mahmood Khan', phone: '03109796509' },
                  { name: 'Azhar Mahmood', phone: '+971 55 955 3018' },
                  { name: 'Sabaz Ali Khan', phone: '03159944181' }
                ].map((brother, i) => {
                  const member = familyMembers.find((m) => m.full_name.includes(brother.name.split(' ')[0]));
                  const actualPhone = member?.phone_number || brother.phone;
                  const memberMsg = composeMessage(brother.name);
                  const memberWa = actualPhone ? getWhatsAppUrl(actualPhone, memberMsg) : null;

                  return (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{brother.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          {actualPhone}
                        </p>
                      </div>

                      {memberWa ? (
                        <a
                          href={memberWa}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 shrink-0 shadow-2xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">N/A</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Task successfully saved in family database
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
