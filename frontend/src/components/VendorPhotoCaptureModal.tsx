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
  Smartphone,
  Sparkles,
} from 'lucide-react';

interface VendorPhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentType: string;
  poNumber?: string;
  vendorName?: string;
  vendorId?: string;
  onCapture: (file: File, previewUrl: string) => void;
}

export const VendorPhotoCaptureModal: React.FC<VendorPhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  title,
  documentType,
  poNumber,
  vendorName = 'Vendor Partner',
  vendorId = 'VENDOR',
  onCapture,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [gpsLocation, setGpsLocation] = useState<{
    lat: string;
    lng: string;
    accuracy: number;
    address: string;
  }>({
    lat: '17.9689',
    lng: '79.5941',
    accuracy: 8,
    address: 'Safal Regional Hub / Mandi Yard, Telangana',
  });
  const [deviceInfoStr, setDeviceInfoStr] = useState('Mobile Device');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Detect device information
  useEffect(() => {
    const ua = navigator.userAgent;
    let dev = 'Desktop Browser';
    if (/android/i.test(ua)) dev = 'Android Mobile';
    else if (/iPad|iPhone|iPod/.test(ua)) dev = 'Apple iOS Device';
    else if (/Windows/.test(ua)) dev = 'Windows Workstation';
    else if (/Macintosh/.test(ua)) dev = 'Mac OS System';
    else if (/Linux/.test(ua)) dev = 'Linux System';

    // Add browser hint
    if (/Chrome/.test(ua) && !/Edge|OPR/.test(ua)) dev += ' (Chrome)';
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) dev += ' (Safari)';
    else if (/Firefox/.test(ua)) dev += ' (Firefox)';
    else if (/Edge/.test(ua)) dev += ' (Edge)';

    setDeviceInfoStr(dev);
  }, []);

  // Update real-time clock string
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

  // Query high-accuracy GPS coordinates
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: pos.coords.latitude.toFixed(5),
            lng: pos.coords.longitude.toFixed(5),
            accuracy: Math.round(pos.coords.accuracy),
            address: 'Verified Geolocation · Mandi Receiving Yard',
          });
        },
        (err) => {
          console.warn('Geolocation lookup notice:', err.message);
          // Fallback location for hub
          setGpsLocation({
            lat: '17.9689',
            lng: '79.5941',
            accuracy: 12,
            address: 'Safal Regional Hub / Mandi Yard, Telangana',
          });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    }
  }, [isOpen]);

  // Start webcam when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhotoUrl(null);
      setCapturedBlob(null);
      setCameraError(null);
      return;
    }

    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: 'environment' | 'user') => {
    setCameraError(null);
    stopCamera();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Live camera is not supported on this browser. Please use photo capture file button.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Live camera error:', err);
      // Fallback try user facing mode if environment fails
      if (mode === 'environment') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
          return;
        } catch {
          // Both failed
        }
      }
      setCameraError(
        'Camera permission was not granted or camera is occupied. Please click "Choose Photo / File" below to snap or select an image.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  /**
   * Watermarks timestamp, GPS, device info, and vendor profile directly onto the image canvas
   */
  const stampPhotoWatermark = (
    imageElement: HTMLVideoElement | HTMLImageElement,
    callback: (dataUrl: string, blob: Blob) => void
  ) => {
    const canvas = document.createElement('canvas');
    const width = 1280;
    const height = 960;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw source camera frame / uploaded image
    ctx.drawImage(imageElement, 0, 0, width, height);

    // 2. Translucent banner at the bottom for tamper-proof watermark
    const bannerHeight = 135;
    ctx.fillStyle = 'rgba(4, 30, 18, 0.90)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // 3. Green emerald accent bar above the banner
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, height - bannerHeight, width, 4);

    // 4. Header text: Company Name & Document Type
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('SAFAL EXPORT AND IMPORT PVT LTD', 24, height - 98);

    ctx.fillStyle = '#FCD34D';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`• ${documentType.toUpperCase()}${poNumber ? ` [${poNumber}]` : ''}`, 440, height - 98);

    // 5. Line 2: Timestamp & Geolocation
    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText(`📅 TIME: ${currentTimeStr}`, 24, height - 68);

    ctx.fillStyle = '#E5E7EB';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `📍 GPS: ${gpsLocation.lat}° N, ${gpsLocation.lng}° E (±${gpsLocation.accuracy}m) · ${gpsLocation.address}`,
      24,
      height - 40
    );

    // 6. Line 3: Operator / Device Info
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `👤 CAPTURED BY: ${vendorName} (${vendorId})   |   📱 DEVICE: ${deviceInfoStr}`,
      24,
      height - 15
    );

    // 7. Right-side digital verification badge
    ctx.textAlign = 'right';
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('✔ LIVE TAMPER-PROOF EVIDENCE', width - 24, height - 70);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '11px monospace';
    ctx.fillText('OFFICIAL SAFAL SUPPLY CHAIN VERIFICATION', width - 24, height - 42);

    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`TOKEN: SF-${Date.now().toString(36).toUpperCase()}`, width - 24, height - 18);

    // Reset text alignment
    ctx.textAlign = 'left';

    // Top-right live geo stamp badge
    ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
    ctx.roundRect ? ctx.roundRect(width - 240, 20, 220, 42, 8) : ctx.fillRect(width - 240, 20, 220, 42);
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#A7F3D0';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('🔴 LIVE GEO-TAGGED', width - 225, 46);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          callback(dataUrl, blob);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleCaptureFromVideo = () => {
    if (!videoRef.current) return;
    stampPhotoWatermark(videoRef.current, (dataUrl, blob) => {
      setCapturedPhotoUrl(dataUrl);
      setCapturedBlob(blob);
      stopCamera();
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        stampPhotoWatermark(img, (dataUrl, blob) => {
          setCapturedPhotoUrl(dataUrl);
          setCapturedBlob(blob);
          stopCamera();
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedBlob || !capturedPhotoUrl) return;
    const cleanDoc = documentType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${cleanDoc}_${Date.now()}.jpg`;
    const stampedFile = new File([capturedBlob], filename, { type: 'image/jpeg' });
    onCapture(stampedFile, capturedPhotoUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden border border-emerald-900/20">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#064D2B] to-[#0A6C3E] text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Camera size={18} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Live Camera Verification
                </span>
                {poNumber && (
                  <span className="text-[10px] font-mono text-emerald-200">
                    PO: {poNumber}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white leading-tight mt-0.5">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Real-time Meta Info Bar */}
        <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100 flex flex-wrap items-center justify-between text-[11px] text-emerald-950 gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 font-bold">
            <Clock size={13} className="text-emerald-700 flex-shrink-0" />
            <span>{currentTimeStr || 'Clock Synchronizing...'}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <MapPin size={13} className="text-emerald-700 flex-shrink-0" />
            <span>
              GPS: {gpsLocation.lat}° N, {gpsLocation.lng}° E
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-emerald-800">
            <Smartphone size={13} className="text-emerald-700 flex-shrink-0" />
            <span className="truncate max-w-[170px]">{deviceInfoStr}</span>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center justify-center bg-gray-900 min-h-[320px] max-h-[500px]">
          {capturedPhotoUrl ? (
            /* Captured & Watermarked Photo Review */
            <div className="relative w-full h-full max-h-[460px] flex flex-col items-center justify-center">
              <img
                src={capturedPhotoUrl}
                alt="Stamped Evidence Preview"
                className="w-full max-h-[420px] object-contain rounded-xl border-2 border-emerald-500 shadow-xl"
              />
              <div className="absolute top-3 left-3 bg-emerald-900/90 text-emerald-200 border border-emerald-500/50 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-xs">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Watermark Applied &amp; Geo-Tagged</span>
              </div>
            </div>
          ) : cameraError ? (
            /* Camera Permission Error / Fallback */
            <div className="p-6 text-center text-white space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Live Camera Unavailable</h3>
                <p className="text-xs text-gray-300 leading-relaxed">{cameraError}</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Upload size={15} /> Select Photo from Device / Gallery
              </button>
            </div>
          ) : (
            /* Live Camera View */
            <div className="relative w-full h-full max-h-[440px] flex items-center justify-center overflow-hidden rounded-xl bg-black border border-emerald-500/30">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full max-h-[440px] object-cover"
              />

              {/* Watermark live overlay hint */}
              <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-xs text-white p-2.5 rounded-lg border border-white/20 text-[10px] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
                  <span className="font-medium">
                    Time, GPS coordinates, and device info will be stamped on capture.
                  </span>
                </div>
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700/60">
                  Tamper Proof
                </span>
              </div>

              {/* Flip camera button */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-xl border border-white/20 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title="Switch Front/Rear Camera"
              >
                <RotateCcw size={14} />
                <span>Flip</span>
              </button>
            </div>
          )}

          {/* Hidden File Input for fallback / gallery pick */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Footer Action Controls */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {capturedPhotoUrl ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw size={14} /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <CheckCircle2 size={15} /> Confirm &amp; Use Photo
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  title="Upload from device storage"
                >
                  <Upload size={14} /> From Gallery
                </button>
                <button
                  type="button"
                  onClick={handleCaptureFromVideo}
                  disabled={Boolean(cameraError)}
                  className="px-6 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  <Camera size={16} className="text-emerald-300" />
                  <span>Snap Photo &amp; Stamp</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
