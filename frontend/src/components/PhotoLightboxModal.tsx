import React from 'react';
import { X, Calendar, MapPin, User, ShieldCheck } from 'lucide-react';

interface PhotoLightboxModalProps {
  photoUrl: string | null;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  time?: string;
  location?: string;
  staffName?: string;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  photoUrl,
  onClose,
  title = 'Verified Office Attendance Photo',
  subtitle,
  time,
  location = 'SAFAL Hub 1 Cold Storage, Navi Mumbai',
  staffName,
}) => {
  if (!photoUrl) return null;

  return (
    <div className="modal-backdrop !z-50" onClick={onClose}>
      <div
        className="modal !w-[620px] max-w-[94vw] p-5 overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} /> Official Biometric Verification
            </div>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-3 rounded-xl overflow-hidden bg-black max-h-[420px] flex items-center justify-center border border-gray-200">
          <img
            src={photoUrl}
            alt="Attendance Verification Photo"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {staffName && (
            <div className="flex items-center gap-1.5 text-gray-800">
              <User size={13} className="text-emerald-700 shrink-0" />
              <span className="font-semibold truncate">{staffName}</span>
            </div>
          )}
          {time && (
            <div className="flex items-center gap-1.5 text-gray-800">
              <Clock size={13} className="text-emerald-700 shrink-0" />
              <span className="font-mono font-bold truncate">{time}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-gray-800">
            <MapPin size={13} className="text-emerald-700 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
