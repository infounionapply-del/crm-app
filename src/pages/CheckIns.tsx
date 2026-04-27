import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { Search, MapPin, List, Map as MapIcon, Image as ImageIcon, Calendar, User, Building2, Clock, X, ExternalLink, Plus } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckInForm } from '../components/checkin/CheckInForm';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons in Vite
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const CheckIns: React.FC = () => {
  const { t } = useLanguage();
  const { checkIns , formatCurrency } = useData();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const defaultView = queryParams.get('view') as 'new' | 'list' | 'map';
  const [viewMode, setViewMode] = useState<'new' | 'list' | 'map'>(defaultView || (isMobile ? 'new' : 'list'));

  // Sync viewMode with URL
  useEffect(() => {
    const view = queryParams.get('view') as 'new' | 'list' | 'map';
    if (view && view !== viewMode) {
      setViewMode(view);
    }
  }, [location.search]);

  const handleViewChange = (mode: 'new' | 'list' | 'map') => {
    setViewMode(mode);
    navigate(`/check-ins?view=${mode}`, { replace: true });
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedCheckIn, setSelectedCheckIn] = useState<any>(null);

  // Filter Data
  const filteredCheckIns = useMemo(() => {
    return checkIns.filter(ci => {
      // Search Filter
      const matchesSearch = 
        (ci.customer && ci.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ci.salesRep && ci.salesRep.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ci.notes && ci.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Date Filter
      let matchesDate = true;
      const ciDate = new Date(ci.created_at);
      const today = new Date();
      
      if (dateFilter === 'today') {
        matchesDate = ciDate.toDateString() === today.toDateString();
      } else if (dateFilter === 'this_week') {
        const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
        matchesDate = ciDate >= firstDay;
      } else if (dateFilter === 'this_month') {
        matchesDate = ciDate.getMonth() === today.getMonth() && ciDate.getFullYear() === today.getFullYear();
      }

      return matchesSearch && matchesDate;
    });
  }, [checkIns, searchTerm, dateFilter]);

  // Parse GPS coordinates safely
  const parseCoordinates = (gps: string): [number, number] | null => {
    if (!gps) return null;
    const parts = gps.split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return null; // Fallback or invalid
  };

  // Default Map Center (Bangkok)
  const defaultCenter: [number, number] = [13.7563, 100.5018];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{t('checkins.title')}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{t('checkins.subtitle')}</p>
        </div>
        <div className="flex bg-surface-container p-1 rounded-xl overflow-x-auto custom-scrollbar no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => handleViewChange('new')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none justify-center ${
              viewMode === 'new' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Plus size={18} /> {t('action.new_checkin')}
          </button>
          <button
            onClick={() => handleViewChange('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none justify-center ${
              viewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <List size={18} /> {t('checkins.list_view')}
          </button>
          <button
            onClick={() => handleViewChange('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none justify-center ${
              viewMode === 'map' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <MapIcon size={18} /> {t('checkins.map_view')}
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input 
            type="text" 
            placeholder={t('checkins.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="all">{t('checkins.all_dates')}</option>
            <option value="today">{t('checkins.today')}</option>
            <option value="this_week">{t('checkins.this_week')}</option>
            <option value="this_month">{t('checkins.this_month')}</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-surface-container-lowest border ghost-border rounded-2xl overflow-hidden editorial-shadow">
        
        {viewMode === 'new' && (
          <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <CheckInForm onSuccess={() => handleViewChange('list')} />
          </div>
        )}

        {viewMode === 'list' && (
          <>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b ghost-border bg-surface-container-low/50">
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.dates')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('common.sales_rep')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.customer')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('checkins.gps_location')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Photo</th>
                  </tr>
                </thead>
                <tbody className="divide-y ghost-border">
                  {filteredCheckIns.map((ci) => (
                    <tr key={ci.id} onClick={() => setSelectedCheckIn(ci)} className="hover:bg-surface-container-lowest/50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-on-surface text-sm">{ci.date}</div>
                        <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                          <Clock size={12} /> {ci.time}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-medium">
                            {ci.salesRep.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-on-surface">{ci.salesRep}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-outline" />
                          <span className="text-sm text-on-surface">{ci.customer}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-blue-600 truncate max-w-[200px]">
                          <MapPin size={16} />
                          <span className="truncate">{ci.gps_location || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {ci.photo_url ? (
                          <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden border ghost-border group-hover:border-primary/30 transition-colors">
                            <img src={ci.photo_url} alt="Check-in" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-outline border ghost-border">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredCheckIns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                        No check-ins found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col p-4 gap-4 bg-surface">
              {filteredCheckIns.map((ci) => (
                <div key={ci.id} onClick={() => setSelectedCheckIn(ci)} className="bg-surface-container-lowest border ghost-border rounded-2xl p-4 editorial-shadow flex gap-4 active:scale-[0.99] transition-transform cursor-pointer">
                  {/* Photo Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-surface-container overflow-hidden flex-shrink-0 border ghost-border relative">
                    {ci.photo_url ? (
                      <img src={ci.photo_url} alt="Check-in" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline">
                        <ImageIcon size={24} />
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-surface-container-lowest/80 backdrop-blur rounded p-1">
                      <MapPin size={12} className="text-primary" />
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="flex flex-col flex-1 justify-center">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
                      <Clock size={12} />
                      {ci.date} {ci.time}
                    </div>
                    <div className="font-semibold text-on-surface text-sm leading-tight mb-1">{ci.customer}</div>
                    
                    <div className="flex items-center gap-2 mt-auto">
                      <div className="w-5 h-5 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-[10px] font-bold">
                        {ci.salesRep.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs text-on-surface-variant truncate max-w-[120px]">{ci.salesRep}</span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCheckIns.length === 0 && (
                <div className="text-center py-8 text-on-surface-variant text-sm">
                  No check-ins found matching your filters.
                </div>
              )}
            </div>
          </>
        )}

        {viewMode === 'map' && (
          <div className="h-[600px] w-full z-0 relative">
            <MapContainer center={defaultCenter} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredCheckIns.map(ci => {
                const coords = parseCoordinates(ci.gps_location);
                if (coords) {
                  return (
                    <Marker key={ci.id} position={coords}>
                      <Popup>
                        <div className="w-48">
                          {ci.photo_url && (
                            <img src={ci.photo_url} alt="Check-in" className="w-full h-24 object-cover rounded-lg mb-2" />
                          )}
                          <div className="font-bold text-sm mb-1">{ci.customer}</div>
                          <div className="text-xs flex items-center gap-1 text-gray-600 mb-1">
                            <User size={10} /> {ci.salesRep}
                          </div>
                          <div className="text-xs flex items-center gap-1 text-gray-600 mb-2">
                            <Clock size={10} /> {ci.date} {ci.time}
                          </div>
                          <button 
                            onClick={() => setSelectedCheckIn(ci)}
                            className="text-xs text-blue-600 hover:underline w-full text-left"
                          >
                            View Full Details
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapContainer>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {selectedCheckIn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl editorial-shadow overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b ghost-border shrink-0">
              <h2 className="text-xl font-headline font-semibold text-on-surface flex items-center gap-2">
                <MapPin size={24} className="text-primary" />
                {t('checkin.details_title')}
              </h2>
              <button onClick={() => setSelectedCheckIn(null)} className="text-outline hover:text-on-surface">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {selectedCheckIn.photo_url ? (
                <div className="w-full h-64 sm:h-96 rounded-xl overflow-hidden border ghost-border bg-black/5 flex items-center justify-center">
                  <img src={selectedCheckIn.photo_url} alt="Evidence" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-full h-32 rounded-xl border-2 border-dashed ghost-border bg-surface-container flex flex-col items-center justify-center text-outline">
                  <ImageIcon size={32} className="mb-2" />
                  <span>{t('checkins.no_photo')}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('table.customer')}</span>
                  <div className="flex items-center gap-2 text-sm text-on-surface font-medium">
                    <Building2 size={16} className="text-primary" />
                    {selectedCheckIn.customer}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('common.sales_rep')}</span>
                  <div className="flex items-center gap-2 text-sm text-on-surface">
                    <User size={16} className="text-primary" />
                    {selectedCheckIn.salesRep}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('checkin.date_time')}</span>
                  <div className="flex items-center gap-2 text-sm text-on-surface">
                    <Calendar size={16} className="text-primary" />
                    {selectedCheckIn.date} at {selectedCheckIn.time}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('checkin.gps_location')}</span>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCheckIn.gps_location)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink size={16} />
                    {t('checkins.view_map')}
                  </a>
                  <div className="text-xs text-on-surface-variant mt-1 truncate">{selectedCheckIn.gps_location}</div>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">{t('checkins.notes')}</span>
                <div className="p-4 bg-surface-container rounded-xl text-sm text-on-surface whitespace-pre-wrap">
                  {selectedCheckIn.notes || 'No notes provided.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckIns;
