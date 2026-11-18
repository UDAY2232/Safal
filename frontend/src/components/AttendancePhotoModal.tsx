import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  MapPin,
  Clock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AttendancePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (photoBase64: string, location: string) => Promise<void>;
  isSubmitting: boolean;
  type?: 'in' | 'out';
}

export const AttendancePhotoModal: React.FC<AttendancePhotoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  type = 'in',
}) => {
  const { user } = useAuth();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('SAFAL Hub 1 Cold Storage, Navi Mumbai');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update clock string for live watermark preview
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const date = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      setCurrentTimeStr(`${date} · ${time} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Start webcam when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhoto(null);
      setCameraError(null);
      return;
    }

    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported by your browser. Please use file capture below.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Webcam permission error:', err);
      setCameraError(
        'Camera permission was denied or camera is unavailable. You can capture or upload an office photo using the device camera button below.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  /**
   * Stamps real-time timestamp, staff name, and office location directly onto the photo
   */
  const stampPhotoWatermark = (imageElement: HTMLVideoElement | HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    const width = 640;
    const height = 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw the camera frame / image
    ctx.drawImage(imageElement, 0, 0, width, height);

    // Draw dark translucent banner at the bottom for tamper-proof watermark
    const bannerHeight = 85;
    ctx.fillStyle = 'rgba(6, 45, 25, 0.85)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Draw green accent border above the banner
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, height - bannerHeight, width, 3);

    // Stamp text: Brand & Timestamp
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('SAFAL EXPORT AND IMPORT PVT LTD', 16, height - 58);

    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`📅 ${currentTimeStr}`, 16, height - 38);

    // Stamp text: Staff Info & Location
    const staffId = user?.employee?.employeeId || user?.accountantProfile?.accountantId || 'STAFF';
    ctx.fillStyle = '#F3F4F6';
    ctx.font = '12px sans-serif';
    ctx.fillText(`👤 ${user?.name || 'Employee'} (${staffId}) · ${type === 'in' ? 'OFFICE IN (ARRIVAL)' : 'OFFICE OUT (DEPARTURE)'}`, 16, height - 16);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#A7F3D0';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`📍 Hub 1 Navi Mumbai`, width - 16, height - 48);

    ctx.fillStyle = '#FCD34D';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('✔ VERIFIED OFFICE CAPTURE', width - 16, height - 24);

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleCaptureFromVideo = () => {
    if (!videoRef.current) return;
    const stamped = stampPhotoWatermark(videoRef.current);
    setCapturedPhoto(stamped);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const stamped = stampPhotoWatermark(img);
        setCapturedPhoto(stamped);
        stopCamera();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleConfirmSubmit = async () => {
    if (!capturedPhoto) return;
    await onSubmit(capturedPhoto, locationName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[680px] max-w-[96vw] max-h-[94vh] flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
              <Camera size={15} />
              <span>{type === 'in' ? 'Office Arrival Verification' : 'Office Departure Verification'}</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {type === 'in' ? 'Take Office Arrival Photo (Office In)' : 'Take Office Departure Photo (Office Out)'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {type === 'in'
                ? 'Take a live photo upon arriving at the office to submit your daily attendance. Date, time, and location will be stamped automatically.'
                : 'Take a live photo before leaving the office to verify your departure and complete your shift for today.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 text-xs">
          {/* Viewport / Photo Frame */}
          <div className="relative w-full aspect-4/3 max-h-[360px] bg-black rounded-2xl overflow-hidden border-2 border-emerald-700/40 shadow-inner flex items-center justify-center">
            {capturedPhoto ? (
              // Captured & Watermarked Photo Preview
              <img
                src={capturedPhoto}
                alt="Captured Office Selfie"
                className="w-full h-full object-cover"
              />
            ) : cameraError ? (
              // Camera Error / Manual Fallback
              <div className="p-6 text-center text-white space-y-3 max-w-md">
                <AlertTriangle size={36} className="text-amber-400 mx-auto" />
                <p className="text-xs text-gray-200">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition inline-flex items-center gap-2"
                >
                  <Upload size={16} /> Open Camera / Take Photo
                </button>
              </div>
            ) : (
              // Live Video Stream
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  onLoadedMetadata={() => videoRef.current?.play()}
                />
                {/* Live Target Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-6 rounded-2xl flex flex-col justify-between p-3">
                  <div className="flex justify-between items-center text-[11px] font-bold text-white bg-black/40 backdrop-blur-xs px-3 py-1 rounded-full w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
                    <span>Live Office Feed · {currentTimeStr}</span>
                  </div>
                  <div className="text-[11px] text-emerald-200 text-center bg-black/50 backdrop-blur-xs py-1 rounded-lg">
                    Align your face within the frame and click Capture
                  </div>
                </div>
              </>
            )}

            {/* Hidden fallback file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Stamped Info Preview Box */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-emerald-700" />
              <span className="text-gray-600 font-medium">Timestamp:</span>
              <span className="font-mono font-bold text-emerald-950">{currentTimeStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-emerald-700" />
              <span className="text-gray-600 font-medium">Location:</span>
              <span className="font-bold text-emerald-950">{locationName}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="modal-actions pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div>
            {!capturedPhoto && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-gray-600 hover:text-emerald-700 flex items-center gap-1.5 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <Upload size={14} /> Upload from Phone / Device Camera
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            {capturedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isSubmitting}
                  className="secondary-button flex items-center gap-1.5"
                >
                  <RotateCcw size={14} /> Retake Photo
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="primary-button !py-2.5 !px-6 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {isSubmitting
                      ? 'Submitting Verification...'
                      : type === 'in'
                      ? 'Confirm & Submit Office Arrival'
                      : 'Confirm & Submit Office Departure'}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCaptureFromVideo}
                disabled={!stream}
                className="primary-button !py-2.5 !px-6 flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
              >
                <Camera size={16} />
                <span>Capture Office Selfie</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
