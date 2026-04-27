import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Camera, Building2, X, CheckCircle, RotateCcw, Loader2, AlertTriangle, Navigation, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../utils/imageCompression';

interface CheckInFormProps {
  onSuccess?: () => void;
  preselectedCustomerId?: string;
  onCancel?: () => void;
}

type FlowStep = 'select-customer' | 'getting-location' | 'ready' | 'uploading' | 'success';

export const CheckInForm: React.FC<CheckInFormProps> = ({ onSuccess, preselectedCustomerId, onCancel }) => {
  const { t } = useLanguage();
  const { customers, fetchCheckIns } = useData();
  const { profile } = useAuth();

  const [step, setStep] = useState<FlowStep>(preselectedCustomerId ? 'getting-location' : 'select-customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsText, setGpsText] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [locationRetries, setLocationRetries] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchIdRef = useRef<number | null>(null);

  // --- GPS Logic with robust fallback ---
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const fetchLocation = useCallback(() => {
    setGpsError('');
    setGpsCoords(null);
    setGpsText('');

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      setStep('ready');
      return;
    }

    // Use watchPosition for faster initial fix on mobile
    stopWatching();

    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        stopWatching();
        // Try one last time with low accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolved = true;
            const { latitude, longitude } = pos.coords;
            setGpsCoords({ lat: latitude, lng: longitude });
            setGpsText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            setGpsError('');
            setStep('ready');
          },
          (err) => {
            console.error('Final GPS fallback failed:', err);
            let errorMsg = 'Could not get your location.';
            if (err.code === 1) {
              errorMsg = 'Location permission denied. Please enable Location in your browser/device settings and try again.';
            } else if (err.code === 2) {
              errorMsg = 'Location unavailable. Make sure GPS is enabled on your device.';
            } else if (err.code === 3) {
              errorMsg = 'Location timed out. Please try again in an open area.';
            }
            setGpsError(errorMsg);
            setStep('ready');
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
        );
      }
    }, 15000);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          stopWatching();
          const { latitude, longitude } = position.coords;
          setGpsCoords({ lat: latitude, lng: longitude });
          setGpsText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setGpsError('');
          setStep('ready');
        }
      },
      (error) => {
        console.warn('watchPosition error:', error);
        // Don't fail immediately — let the timeout fallback handle it
        if (error.code === 1) {
          // Permission denied — fail immediately
          resolved = true;
          clearTimeout(timeoutId);
          stopWatching();
          setGpsError('Location permission denied. Please enable Location in your browser/device settings, then reload and try again.');
          setStep('ready');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
    watchIdRef.current = id;
  }, [stopWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  // Auto-fetch location when entering getting-location step
  useEffect(() => {
    if (step === 'getting-location') {
      fetchLocation();
    }
  }, [step, locationRetries]);

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setStep('getting-location');
  };

  const handleRetryLocation = () => {
    setStep('getting-location');
    setLocationRetries(prev => prev + 1);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setPhotoFile(compressed);
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.error('Error compressing image:', err);
        alert('Failed to process image. Please try again.');
      }
    }
  };

  const handleRetakePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Re-open camera immediately
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId || !photoFile) return;
    
    try {
      setStep('uploading');
      setUploadProgress(10);

      const customer = customers.find(c => c.id === selectedCustomerId);
      if (!customer) throw new Error('Customer not found');

      // Upload photo
      setUploadProgress(30);
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `checkins/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('checkin-images')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      const { data: publicUrlData } = supabase.storage
        .from('checkin-images')
        .getPublicUrl(filePath);

      // Save record
      setUploadProgress(80);
      const salesRepName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile?.name || 'Unknown Rep';

      const { error: dbError } = await supabase
        .from('check_ins')
        .insert([{
          customer_id: customer.id,
          customer_name: customer.name,
          sales_rep_id: profile?.id,
          sales_rep_name: salesRepName,
          gps_location: gpsText || 'Unknown',
          photo_url: publicUrlData.publicUrl,
          notes: notes
        }]);

      if (dbError) throw dbError;

      setUploadProgress(100);
      await fetchCheckIns();
      setStep('success');

      // Auto-redirect after 2s
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);

    } catch (error: any) {
      console.error('Error saving check-in:', error);
      alert(error.message || 'Failed to save check-in');
      setStep('ready');
      setUploadProgress(0);
    }
  };

  // Hidden camera input
  const CameraInput = (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handlePhotoChange}
      accept="image/*"
      capture="environment"
      className="hidden"
    />
  );

  // --- STEP: Select Customer ---
  if (step === 'select-customer') {
    return (
      <div className="space-y-6">
        {CameraInput}
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Building2 size={32} />
          </div>
          <h2 className="text-xl font-headline font-bold text-on-surface">{t('checkin.select_customer_placeholder')}</h2>
          <p className="text-sm text-on-surface-variant mt-1">เลือกลูกค้าที่คุณกำลังเข้าพบ</p>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {customers.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCustomerSelect(c.id)}
              className="w-full text-left p-4 bg-surface-container-low border ghost-border rounded-xl flex items-center gap-3 active:scale-[0.98] transition-transform hover:border-primary/40"
            >
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm flex-shrink-0">
                {c.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-on-surface truncate">{c.name}</div>
                {c.contactPerson && <div className="text-xs text-on-surface-variant truncate">{c.contactPerson}</div>}
              </div>
            </button>
          ))}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 text-on-surface-variant hover:bg-surface-container rounded-xl font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    );
  }

  // --- STEP: Getting Location ---
  if (step === 'getting-location') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        {CameraInput}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Navigation size={40} className="text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-primary/30 animate-ping" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-headline font-semibold text-on-surface">กำลังหาตำแหน่ง...</h2>
          <p className="text-sm text-on-surface-variant mt-1">กรุณารอสักครู่ ระบบกำลังดึงตำแหน่ง GPS ของคุณ</p>
        </div>
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // --- STEP: Success ---
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center animate-bounce">
          <CheckCircle size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-headline font-bold text-on-surface">เช็คอินสำเร็จ!</h2>
          <p className="text-sm text-on-surface-variant mt-1">Check-in successful</p>
        </div>
      </div>
    );
  }

  // --- STEP: Uploading ---
  if (step === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        {CameraInput}
        <Loader2 size={48} className="text-primary animate-spin" />
        <div className="text-center">
          <h2 className="text-lg font-headline font-semibold text-on-surface">กำลังบันทึก...</h2>
          <p className="text-sm text-on-surface-variant mt-1">Uploading photo and saving check-in</p>
        </div>
        <div className="w-full max-w-xs bg-surface-container-high rounded-full h-2 overflow-hidden">
          <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
        </div>
      </div>
    );
  }

  // --- STEP: Ready (main form) ---
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-5">
      {CameraInput}

      {/* Customer Badge */}
      <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm flex-shrink-0">
          {selectedCustomer?.name?.substring(0, 2).toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-on-surface text-sm truncate">{selectedCustomer?.name || 'Unknown'}</div>
          <div className="text-xs text-on-surface-variant">Check-in customer</div>
        </div>
        {!preselectedCustomerId && (
          <button
            type="button"
            onClick={() => { setStep('select-customer'); setSelectedCustomerId(''); }}
            className="text-xs text-primary font-medium px-3 py-1.5 bg-primary/10 rounded-lg"
          >
            Change
          </button>
        )}
      </div>

      {/* GPS Status */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${gpsError ? 'border-error/50 bg-error/5' : gpsCoords ? 'border-green-200 bg-green-50' : 'ghost-border bg-surface-container'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={18} className={gpsError ? 'text-error flex-shrink-0' : gpsCoords ? 'text-green-600 flex-shrink-0' : 'text-outline flex-shrink-0'} />
          {gpsError ? (
            <div className="min-w-0">
              <span className="text-sm text-error block leading-tight">{gpsError}</span>
            </div>
          ) : gpsCoords ? (
            <span className="text-sm text-green-700 font-medium truncate">{gpsText}</span>
          ) : (
            <span className="text-sm text-outline animate-pulse">Fetching location...</span>
          )}
        </div>
        {(gpsError || !gpsCoords) && (
          <button
            type="button"
            onClick={handleRetryLocation}
            className="flex-shrink-0 ml-2 text-primary hover:text-primary-dark font-medium text-xs px-3 py-1.5 bg-primary/10 rounded-lg transition-colors flex items-center gap-1"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        )}
      </div>

      {/* Photo Capture / Preview */}
      {photoPreview ? (
        <div className="relative rounded-2xl overflow-hidden border ghost-border bg-surface-container">
          <img src={photoPreview} alt="Check-in preview" className="w-full h-56 object-cover" />
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex justify-center gap-3">
            <button
              type="button"
              onClick={handleRetakePhoto}
              className="flex items-center gap-2 px-4 py-2 bg-white/90 text-on-surface font-medium rounded-full text-sm shadow-lg active:scale-95 transition-transform"
            >
              <RotateCcw size={16} />
              Retake
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl p-10 flex flex-col items-center justify-center text-center active:bg-primary/10 transition-colors cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center mb-3 shadow-lg">
            <Camera size={32} />
          </div>
          <span className="text-base font-semibold text-primary">{t('checkin.tap_to_take_photo')}</span>
          <span className="text-xs text-on-surface-variant mt-1">ถ่ายรูปหลักฐานการเข้าพบ</span>
        </button>
      )}

      {/* Notes (optional) */}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          {t('checkin.visit_notes')}
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none text-base sm:text-sm"
          placeholder={t('checkin.visit_notes_placeholder')}
        />
      </div>

      {/* Submit */}
      <div className="pt-2 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!photoFile}
          className="w-full py-4 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-2xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-40 disabled:hover:shadow-none flex justify-center items-center gap-2 active:scale-[0.98]"
        >
          <CheckCircle size={22} />
          <span>{t('checkin.submit')}</span>
        </button>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 text-on-surface-variant hover:bg-surface-container rounded-xl font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  );
};
