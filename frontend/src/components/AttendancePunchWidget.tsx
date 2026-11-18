import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import { api } from '../services/api';
import { AttendancePhotoModal } from './AttendancePhotoModal';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface AttendancePunchWidgetProps {
  onStatusChange?: () => void;
  onViewLogs?: () => void;
  compact?: boolean;
}

export const AttendancePunchWidget: React.FC<AttendancePunchWidgetProps> = ({
  onStatusChange,
  onViewLogs,
  compact = false,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoModalType, setPhotoModalType] = useState<'in' | 'out'>('in');
  const [lightboxData, setLightboxData] = useState<{
    url: string;
    title: string;
    time?: string;
  } | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getTodayAttendance();
      setTodayData(res);
    } catch (err: any) {
      console.error('Failed to load today attendance status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  const handleStartOfficeIn = () => {
    setPhotoModalType('in');
    setShowPhotoModal(true);
  };

  const handleStartOfficeOut = () => {
    setPhotoModalType('out');
    setShowPhotoModal(true);
  };

  const handlePhotoSubmit = async (photoBase64: string, location: string) => {
    try {
      setActionLoading(true);
      setFeedback(null);
      if (photoModalType === 'in') {
        const res = await api.clockInAttendance({ photo: photoBase64, location });
        setFeedback({
          type: 'success',
          message: res.message || 'Office arrival photo verified! Attendance recorded successfully.',
        });
      } else {
        const res = await api.clockOutAttendance({ photo: photoBase64, location });
        setFeedback({
          type: 'success',
          message: res.message || 'Office departure photo verified! Shift completed successfully.',
        });
      }
      await fetchTodayStatus();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit attendance photo' });
    } finally {
      setActionLoading(false);
    }
  };

  const record = todayData?.record;
  const isPresent = !!record;
  const isClockedIn = isPresent;
  const isClockedOut = !!record?.clockOutTime;

  // Format digital clock
  const timeFormatted = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateFormatted = currentTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Calculate elapsed time and progress towards 8 hours (09:30 AM to 06:30 PM)
  const TARGET_WORK_MINUTES = 480; // 8 Hours standard working hours
  let elapsedMinutes = 0;
  let elapsedText = '';
  if (isPresent && record?.clockInTime) {
    const start = new Date(record.clockInTime).getTime();
    const end = record?.clockOutTime ? new Date(record.clockOutTime).getTime() : currentTime.getTime();
    elapsedMinutes = Math.max(0, Math.floor((end - start) / 60000));
    const h = Math.floor(elapsedMinutes / 60);
    const m = elapsedMinutes % 60;
    elapsedText = `${h}h ${m}m`;
  }
  const progressPercent = Math.min(100, Math.round((elapsedMinutes / TARGET_WORK_MINUTES) * 100));
  const remainingMins = Math.max(0, TARGET_WORK_MINUTES - elapsedMinutes);
  const remainingText = `${Math.floor(remainingMins / 60)}h ${remainingMins % 60}m`;

  const formatRecordTime = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-sm overflow-hidden">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#064D2B] via-[#086333] to-[#0A7B3E] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
            <Clock size={18} className="text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm tracking-wide">Daily Office Attendance</h2>
              <span className="text-[10px] bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full font-semibold border border-emerald-400/30">
                Live Photo Verification
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 flex items-center gap-1.5 mt-0.5">
              <MapPin size={11} className="text-emerald-300" />
              <span>SAFAL Hub 1 · Navi Mumbai Cold Storage</span>
              <span className="opacity-60">|</span>
              <span>Official Shift: <strong>05:30 – 06:00 AM to 02:00 PM (Office) + 2h Sales Growth</strong></span>
            </p>
          </div>
        </div>

        {onViewLogs && (
          <button
            onClick={onViewLogs}
            className="text-xs font-semibold text-emerald-100 hover:text-white flex items-center gap-1 hover:underline transition"
          >
            Attendance Logs &amp; Monthly Summary <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="p-5">
        {feedback && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between gap-3 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[11px] font-bold text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Digital Clock & Current Status Column */}
          <div className="lg:col-span-5 flex flex-col items-center sm:items-start text-center sm:text-left bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Calendar size={13} className="text-emerald-600" />
              <span>{dateFormatted}</span>
            </div>

            {/* Live Ticking Time */}
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-950 mb-2">
              {timeFormatted}
            </div>

            {/* Current Status Pill */}
            {loading ? (
              <div className="text-xs text-gray-500 animate-pulse">Checking attendance status...</div>
            ) : !isPresent ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Not Marked Yet Today</span>
              </div>
            ) : (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  record?.status === 'LATE'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                <CheckCircle2 size={14} className={record?.status === 'LATE' ? 'text-amber-600' : 'text-emerald-600'} />
                <span>
                  {record?.status === 'LATE' ? 'Late Arrival Marked' : 'Attendance Marked (Present)'}
                </span>
              </div>
            )}

            <div className="text-[11px] text-gray-500 mt-2">
              Official Shift: <strong>09:30 AM – 06:30 PM</strong> (Total 8 Working Hours). Arrive before <strong>09:30 AM</strong> for on-time verification.
            </div>
          </div>

          {/* Action Button Column */}
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            {!isPresent ? (
              <>
                <button
                  onClick={handleStartOfficeIn}
                  disabled={actionLoading || loading}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-[#087A3E] to-[#0A964C] hover:from-[#066533] hover:to-[#087A3E] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 disabled:opacity-50 group cursor-pointer"
                >
                  <Camera size={19} className="text-emerald-200 group-hover:scale-110 transition" />
                  <span>{actionLoading ? 'Recording Arrival...' : 'Office In: Take Photo & Record Arrival (05:30 – 06:00 AM)'}</span>
                </button>
                <p className="text-[11px] text-center text-gray-500">
                  Official Shift: <strong>05:30 – 06:00 AM Arrival to 02:00 PM Office Departure</strong> + <strong>2 Extra Hours</strong> for company growth and sales.
                </p>
              </>
            ) : !isClockedOut ? (
              <>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 mb-0.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-950 mb-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Office In: {formatRecordTime(record?.clockInTime)}
                    </span>
                    <span className="text-emerald-800 font-mono font-bold">{elapsedText} / 8h 00m</span>
                  </div>
                  {/* Visual 8-Hour Shift Progress Bar */}
                  <div className="w-full bg-emerald-200/70 rounded-full h-2 overflow-hidden my-1.5">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-emerald-800 font-semibold">
                    <span>{progressPercent}% Office Work Completed</span>
                    <span>{remainingMins > 0 ? `${remainingText} to 02:00 PM Exit` : '🎉 8h Office Goal Met! (+2h Sales)'}</span>
                  </div>
                </div>
                <button
                  onClick={handleStartOfficeOut}
                  disabled={actionLoading || loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 disabled:opacity-50 group cursor-pointer"
                >
                  <Camera size={18} className="text-blue-200 group-hover:scale-110 transition" />
                  <span>{actionLoading ? 'Recording Departure...' : 'Office Out: Take Photo & Complete Office Shift (02:00 PM)'}</span>
                </button>
                <p className="text-[11px] text-center text-gray-500">
                  Office concludes at <strong>02:00 PM</strong> followed by <strong>2 extra hours</strong> for company growth, sales, and client visits.
                </p>
              </>
            ) : (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-1.5" />
                <span className="font-bold text-emerald-950 text-sm block">Shift Completed for Today</span>
                <p className="text-xs text-emerald-800 mt-1">
                  Office In: <strong>{formatRecordTime(record?.clockInTime)}</strong> · Office Out: <strong>{formatRecordTime(record?.clockOutTime)}</strong>
                </p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <span>In-Office Duration: {elapsedText}</span>
                  <span>•</span>
                  <span>{elapsedMinutes >= TARGET_WORK_MINUTES ? '✅ 8h Office Completed' : 'Standard Office Shift: 8h'}</span>
                </div>
                <div className="mt-1.5 text-[10px] text-emerald-700 font-semibold">
                  Shift: 05:30/06:00 AM – 02:00 PM + 2h Sales &amp; Growth · Both Photos Verified
                </div>
              </div>
            )}
          </div>

          {/* Today's Details Column */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-2 text-xs">
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-gray-500 font-medium">Office Shift:</span>
              <span className="font-bold text-gray-800 font-mono text-[11px]">
                05:30/06:00 AM – 02:00 PM
              </span>
            </div>
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <span className="text-emerald-800 font-medium">Growth &amp; Sales:</span>
              <span className="font-bold text-emerald-950 font-mono text-[11px]">
                +2 Hours (Till 04:00 PM)
              </span>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-gray-500 font-medium">Target Work:</span>
              <span className="font-bold text-emerald-900 font-mono">
                8h 00m
              </span>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-gray-500 font-medium">Arrival Time:</span>
              <span className="font-bold text-emerald-900 font-mono">
                {formatRecordTime(record?.clockInTime)}
              </span>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-gray-500 font-medium">Departure Time:</span>
              <span className="font-bold text-gray-800 font-mono">
                {record?.clockOutTime ? formatRecordTime(record?.clockOutTime) : isPresent ? 'In Office' : '--:--'}
              </span>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-gray-500 font-medium">Worked Today:</span>
              <span className="font-bold text-emerald-900 font-mono">
                {isPresent ? elapsedText : '--:--'}
              </span>
            </div>
            <div className="flex gap-2">
              {record?.photoUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxData({
                      url: record.photoUrl,
                      title: 'Office Arrival (In) Photo',
                      time: formatRecordTime(record.clockInTime),
                    })
                  }
                  className="flex-1 p-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-300 flex items-center justify-center gap-1.5 transition cursor-pointer text-emerald-950 font-bold text-xs"
                >
                  <Camera size={13} className="text-emerald-700" />
                  <span>In Photo</span>
                </button>
              )}
              {record?.clockOutPhotoUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxData({
                      url: record.clockOutPhotoUrl,
                      title: 'Office Departure (Out) Photo',
                      time: formatRecordTime(record.clockOutTime),
                    })
                  }
                  className="flex-1 p-2 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-300 flex items-center justify-center gap-1.5 transition cursor-pointer text-blue-950 font-bold text-xs"
                >
                  <Camera size={13} className="text-blue-700" />
                  <span>Out Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Office Presence Summary Bar */}
        {todayData?.officeOverview && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Present Today: <strong>{todayData.officeOverview.totalPresent}</strong> staff</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>In Office Now: <strong>{todayData.officeOverview.activeInOffice}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Late Arrivals: <strong>{todayData.officeOverview.lateArrivals}</strong></span>
              </span>
            </div>

            {record?.clockInIp && (
              <div className="text-[11px] text-gray-400 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Office IP: {record.clockInIp}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Camera Office Selfie Modal */}
      <AttendancePhotoModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSubmit={handlePhotoSubmit}
        isSubmitting={actionLoading}
        type={photoModalType}
      />

      {/* Photo Lightbox Preview */}
      <PhotoLightboxModal
        photoUrl={lightboxData?.url || null}
        title={lightboxData?.title || 'Verified Office Attendance Photo'}
        time={lightboxData?.time || formatRecordTime(record?.clockInTime)}
        onClose={() => setLightboxData(null)}
        location={record?.location || 'SAFAL Hub 1 Cold Storage, Navi Mumbai'}
        staffName={record?.user?.name}
      />
    </div>
  );
};
