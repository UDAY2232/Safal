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
  Compass,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export interface GpsLocationData {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  workplaceLocationId?: string;
  workplaceName?: string;
  distanceMeters?: number;
}

interface AttendancePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (photoBase64: string, location: string, gpsData?: GpsLocationData) => Promise<void>;
  isSubmitting: boolean;
  type?: 'in' | 'out';
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // GPS State
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'ready' | 'error' | 'denied'>('locating');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [nearestWorkplace, setNearestWorkplace] = useState<any | null>(null);
  const [distanceToWorkplace, setDistanceToWorkplace] = useState<number | null>(null);
  const [isInGeofence, setIsInGeofence] = useState<boolean | null>(null);

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

  // Fetch workplace geofences
  useEffect(() => {
    if (!isOpen) return;
    api
      .getWorkplaces()
      .then((res) => {
        if (res?.workplaces) {
          setWorkplaces(res.workplaces);
        }
      })
      .catch((err) => console.warn('Could not fetch workplaces:', err));
  }, [isOpen]);

  // Request high-accuracy GPS position
  const requestGpsPosition = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('locating');
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ latitude, longitude, accuracy });
        setGpsStatus('ready');
      },
      (err) => {
        console.warn('GPS error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
          setGpsError('Location permission denied. Please enable GPS location in your browser settings.');
        } else {
          setGpsStatus('error');
          setGpsError(`Unable to acquire GPS position: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // Evaluate geofence when coordinates or workplaces update
  useEffect(() => {
    if (!coords) return;

    // Default SAFAL coordinates if workplaces list empty
    const locationsToTest = workplaces.length > 0 ? workplaces : [
      {
        id: 'default-hq',
        name: 'SAFAL Head Office & Operations Facility',
        address: '3-4-693/5/1/A/1, Raipura, Kakatiya colony, Hanamkonda',
        latitude: 18.0065,
        longitude: 79.5584,
        allowedRadiusMeters: 100,
      },
    ];

    let nearest = locationsToTest[0];
    let minD = calculateDistance(
      coords.latitude,
      coords.longitude,
      Number(nearest.latitude),
      Number(nearest.longitude)
    );

    for (let i = 1; i < locationsToTest.length; i++) {
      const wp = locationsToTest[i];
      const d = calculateDistance(
        coords.latitude,
        coords.longitude,
        Number(wp.latitude),
        Number(wp.longitude)
      );
      if (d < minD) {
        minD = d;
        nearest = wp;
      }
    }

    setNearestWorkplace(nearest);
    setDistanceToWorkplace(minD);
    setIsInGeofence(minD <= (nearest.allowedRadiusMeters || 100));
  }, [coords, workplaces]);

  // Start webcam and GPS when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhoto(null);
      setCameraError(null);
      setCoords(null);
      return;
    }

    startCamera();
    requestGpsPosition();

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
   * Stamps real-time timestamp, staff name, GPS coordinates, and workplace geofence info
   * directly onto the photo
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
    const bannerHeight = 98;
    ctx.fillStyle = 'rgba(6, 45, 25, 0.90)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Accent line above banner
    ctx.fillStyle = isInGeofence ? '#10B981' : '#F59E0B';
    ctx.fillRect(0, height - bannerHeight, width, 3);

    // Stamp text: Brand & Timestamp
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('SAFAL EXPORT AND IMPORT PVT LTD', 16, height - 72);

    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`📅 ${currentTimeStr}`, 16, height - 52);

    // Stamp text: Staff Info & Shift
    const staffId = user?.employee?.employeeId || user?.accountantProfile?.accountantId || 'STAFF';
    ctx.fillStyle = '#F3F4F6';
    ctx.font = '11px sans-serif';
    ctx.fillText(
      `👤 ${user?.name || 'Employee'} (${staffId}) · ${type === 'in' ? 'PUNCH IN (ARRIVAL)' : 'PUNCH OUT (DEPARTURE)'}`,
      16,
      height - 32
    );

    // Stamp text: GPS verification coordinates & geofence distance
    ctx.fillStyle = coords ? (isInGeofence ? '#A7F3D0' : '#FDE68A') : '#D1D5DB';
    ctx.font = '10px monospace';
    const gpsText = coords
      ? `📍 GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (±${Math.round(coords.accuracy)}m) · ${nearestWorkplace?.name || 'SAFAL Hub'} (${distanceToWorkplace ?? 0}m)`
      : '📍 GPS: Locating Device Coordinates...';
    ctx.fillText(gpsText, 16, height - 12);

    // Stamp badge on right: Verified status
    ctx.textAlign = 'right';
    ctx.fillStyle = isInGeofence ? '#10B981' : '#F59E0B';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(isInGeofence ? '✔ GEOFENCE VERIFIED' : '⚠ GEOFENCE PENDING', width - 16, height - 68);

    ctx.fillStyle = '#A7F3D0';
    ctx.font = '10px sans-serif';
    ctx.fillText(nearestWorkplace?.name ? `${nearestWorkplace.name.slice(0, 28)}` : 'Raipura, Hanamkonda', width - 16, height - 48);

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

    const locationName = nearestWorkplace?.name
      ? `${nearestWorkplace.name} (GPS Verified)`
      : 'SAFAL Operations Facility, Hanamkonda';

    const gpsData: GpsLocationData = {
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      accuracy: coords?.accuracy,
      workplaceLocationId: nearestWorkplace?.id,
      workplaceName: nearestWorkplace?.name,
      distanceMeters: distanceToWorkplace ?? undefined,
    };

    await onSubmit(capturedPhoto, locationName, gpsData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[680px] max-w-[96vw] max-h-[94vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        {/* Header */}
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
              <Camera size={15} />
              <span>{type === 'in' ? 'GPS Workplace Verification & Photo' : 'Office Departure Verification'}</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {type === 'in' ? 'Record Office Arrival (GPS Verified IN)' : 'Record Office Departure (Office Out)'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {type === 'in'
                ? 'Your device GPS coordinates and live photo verify attendance within the registered workplace geofence. Lateness is calculated from your assigned shift.'
                : 'Take a live departure photo to complete your daily shift hours and conclude attendance.'}
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
        <div className="overflow-y-auto flex-1 py-3 space-y-3 text-xs">
          {/* GPS Live Geofence Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              gpsStatus === 'ready'
                ? isInGeofence
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
                : gpsStatus === 'locating'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                  gpsStatus === 'ready'
                    ? isInGeofence
                      ? 'bg-emerald-600'
                      : 'bg-amber-500'
                    : gpsStatus === 'locating'
                    ? 'bg-blue-600'
                    : 'bg-rose-600'
                }`}
              >
                {gpsStatus === 'locating' ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Compass size={16} />
                )}
              </div>
              <div>
                <div className="font-extrabold flex items-center gap-2">
                  <span>
                    {gpsStatus === 'ready'
                      ? isInGeofence
                        ? `Inside Workplace Geofence (${distanceToWorkplace}m away)`
                        : `Outside Authorized Geofence (${distanceToWorkplace}m away)`
                      : gpsStatus === 'locating'
                      ? 'Acquiring High-Accuracy GPS Fix...'
                      : 'GPS Location Unavailable'}
                  </span>
                  {gpsStatus === 'ready' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-white/70 border border-current">
                      ±{Math.round(coords?.accuracy || 0)}m
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-85 mt-0.5">
                  {nearestWorkplace
                    ? `${nearestWorkplace.name} · Allowed radius: ${nearestWorkplace.allowedRadiusMeters || 100}m`
                    : 'Locating closest SAFAL office or warehouse...'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={requestGpsPosition}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white shadow-xs border border-gray-200 hover:bg-gray-50 flex items-center gap-1 transition"
              title="Refresh GPS"
            >
              <Navigation size={12} />
              <span>Retry GPS</span>
            </button>
          </div>

          {/* Viewport / Photo Frame */}
          <div className="relative w-full aspect-4/3 max-h-[330px] bg-black rounded-2xl overflow-hidden border-2 border-emerald-700/40 shadow-inner flex items-center justify-center">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Captured Office Selfie"
                className="w-full h-full object-cover"
              />
            ) : cameraError ? (
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
                <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-5 rounded-2xl flex flex-col justify-between p-3">
                  <div className="flex justify-between items-center text-[11px] font-bold text-white bg-black/40 backdrop-blur-xs px-3 py-1 rounded-full w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
                    <span>Live Camera · {currentTimeStr}</span>
                  </div>
                  <div className="text-[11px] text-emerald-200 text-center bg-black/50 backdrop-blur-xs py-1 rounded-lg">
                    Look at the camera and click Capture Office Photo
                  </div>
                </div>
              </>
            )}

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
              <Clock size={14} className="text-emerald-700" />
              <span className="text-gray-600 font-medium">Punch Timestamp:</span>
              <span className="font-mono font-bold text-emerald-950">{currentTimeStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-emerald-700" />
              <span className="text-gray-600 font-medium">Nearest Workplace:</span>
              <span className="font-bold text-emerald-950">
                {nearestWorkplace?.name || 'SAFAL Raipura Hanamkonda'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="modal-actions pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
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

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              className="secondary-button !min-h-[40px]"
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
                  className="secondary-button !min-h-[40px] flex items-center gap-1.5"
                >
                  <RotateCcw size={14} /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="primary-button !min-h-[40px] !py-2 !px-4 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {isSubmitting
                      ? 'Submitting...'
                      : type === 'in'
                      ? 'Confirm & Submit Office In'
                      : 'Confirm & Submit Office Out'}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCaptureFromVideo}
                disabled={!stream}
                className="primary-button !min-h-[40px] !py-2.5 !px-6 flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
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
