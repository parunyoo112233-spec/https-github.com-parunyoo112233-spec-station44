/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Bell, Check, CheckCheck, Trash2, Calendar } from 'lucide-react';
import { SystemNotification, UserProfile } from '../types';
import { markNotificationAsRead } from '../lib/db-helpers';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  currentUser: UserProfile;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  currentUser
}: NotificationsModalProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string) => {
    setLoadingId(id);
    try {
      await markNotificationAsRead(id, currentUser.uid);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => n.id && (!n.readBy || !n.readBy.includes(currentUser.uid)));
    if (unread.length === 0) return;
    
    setLoadingId('all');
    try {
      for (const notif of unread) {
        if (notif.id) {
          await markNotificationAsRead(notif.id, currentUser.uid);
        }
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const formatThaiDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const day = d.getDate();
    const month = thaiMonthsShort[d.getMonth()];
    const year = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
  };

  const unreadCount = notifications.filter(n => !n.readBy || !n.readBy.includes(currentUser.uid)).length;

  return (
    <div id="notifications_modal_overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        id="notifications_modal_container" 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fadeIn"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#0f172a]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">การแจ้งเตือนคลังน้ำมัน</h2>
              <p className="text-[10px] text-slate-400 font-medium font-mono uppercase tracking-wider">
                สังกัด: {currentUser.department}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Bar */}
        {notifications.length > 0 && (
          <div className="px-5 py-3 bg-slate-905 border-b border-slate-800/60 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">
              มีข้อความใหม่ <span className="text-emerald-400 font-bold font-mono">{unreadCount}</span> รายการ
            </span>
            {unreadCount > 0 && (
              <button
                disabled={loadingId !== null}
                onClick={handleMarkAllAsRead}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                อ่านทั้งหมด
              </button>
            )}
          </div>
        )}

        {/* List Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 bg-slate-800/40 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                <Bell className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-300">ไม่มีการแจ้งเตือนในขณะนี้</p>
                <p className="text-xs text-slate-500">ประวัติการเพิ่มโควต้าน้ำมันสังกัด {currentUser.department} จะแสดงที่นี่</p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.readBy || !notif.readBy.includes(currentUser.uid);
              return (
                <div 
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition duration-150 relative overflow-hidden ${
                    isUnread 
                      ? 'bg-emerald-500/[0.03] border-emerald-500/25 hover:border-emerald-500/45 shadow-sm shadow-emerald-500/[0.02]' 
                      : 'bg-slate-950/20 border-slate-800/80 hover:border-slate-800'
                  }`}
                >
                  {/* Unread indicator bar */}
                  {isUnread && (
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-500" />
                  )}

                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isUnread ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                        <h4 className="text-xs font-black text-white leading-snug">
                          {notif.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-3.5">
                        {notif.message}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold font-mono pt-1.5 pl-3.5">
                        <Calendar className="h-3 w-3" />
                        <span>{formatThaiDate(notif.createdAt)}</span>
                      </div>
                    </div>

                    {isUnread && notif.id && (
                      <button
                        disabled={loadingId === notif.id}
                        onClick={() => handleMarkAsRead(notif.id!)}
                        className="px-2.5 py-1 text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-lg transition shrink-0 cursor-pointer disabled:opacity-50"
                        title="ทำเครื่องหมายว่าอ่านแล้ว"
                      >
                        {loadingId === notif.id ? '...' : 'อ่านแล้ว'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
