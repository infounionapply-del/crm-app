import React, { useState, useMemo, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage, useT } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { Search, Plus, Filter, MoreVertical, Building2, User, Phone, Mail, X, MapPin, Camera, Edit2, Map as MapIcon, List } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { CheckInForm } from '../components/checkin/CheckInForm';

const Customers: React.FC = () => {
  const t = useT();
  const { notify } = useNotification();
  const { customers, addCustomer, updateCustomer, addCheckIn, checkIns , formatCurrency } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [viewingCustomer, setViewingCustomer] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Check-in Modal State
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInCustomer, setCheckInCustomer] = useState<any>(null);
  const [checkInData, setCheckInData] = useState({
    notes: '',
    gps: '',
    photo: null as File | null
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    type: 'Enterprise',
    status: 'Lead',
    typeBu: 'บริษัทจำกัด',
    groupBu: 'ทั่วไป',
    taxId: '',
    address: '',
    province: '',
    district: '',
    tambon: '',
    gpsLocation: ''
  });

  const [isLocating, setIsLocating] = useState(false);

  const handleGetLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setFormData(prev => ({ ...prev, gpsLocation: `${lat}, ${lng}` }));

          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th`);
            const data = await response.json();
            if (data && data.address) {
              setFormData(prev => ({
                ...prev,
                province: data.address.state || data.address.province || prev.province,
                district: data.address.county || data.address.city_district || data.address.city || prev.district,
                tambon: data.address.suburb || data.address.village || data.address.town || data.address.neighbourhood || prev.tambon
              }));
            }
          } catch (error) {
            console.error("Geocoding failed:", error);
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          notify.success("Location access denied or unavailable");
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      notify.success("Geolocation not supported by this browser");
      setIsLocating(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  const handleOpenModal = (customer: any = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '', contact: '', email: '', phone: '', type: 'Enterprise', status: 'Lead',
        typeBu: 'บริษัทจำกัด', groupBu: 'ทั่วไป', taxId: '', address: '', province: '', district: '', tambon: '', gpsLocation: ''
      });
    }
    setIsModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const saveTask = editingCustomer ? updateCustomer(editingCustomer.id, formData) : addCustomer(formData);
    
    notify.promise(saveTask, {
      loading: 'Saving customer...',
      success: () => {
        setIsModalOpen(false);
        return 'Customer saved successfully.';
      },
      error: 'Failed to save customer'
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  const handleOpenCheckIn = (customer: any) => {
    setCheckInCustomer(customer);
    setCheckInData({ notes: '', gps: 'Fetching location...', photo: null });
    setPhotoPreview(null);
    setIsCheckInModalOpen(true);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCheckInData(prev => ({ ...prev, gps: `${position.coords.latitude}, ${position.coords.longitude}` }));
        },
        (error) => {
          console.error("Error getting location:", error);
          setCheckInData(prev => ({ ...prev, gps: 'Location access denied or unavailable' }));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setCheckInData(prev => ({ ...prev, gps: 'Geolocation not supported by this browser' }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCheckInData(prev => ({ ...prev, photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInData.photo) {
      notify.error("Please take a photo for check-in evidence.");
      return;
    }

    setIsSubmitting(true);
    const checkInTask = addCheckIn({
      customerId: checkInCustomer.id,
      gps: checkInData.gps,
      notes: checkInData.notes,
      photo: checkInData.photo
    });

    notify.promise(checkInTask, {
      loading: 'Recording check-in...',
      success: () => {
        setIsCheckInModalOpen(false);
        setCheckInCustomer(null);
        return 'Check-in recorded successfully!';
      },
      error: (error: any) => `Failed to save check-in: ${error.message || 'Unknown error'}`
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{t('nav.customers')}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{t('customer.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center bg-surface-container p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <List size={18} /> {t('common.list')}
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              <MapIcon size={18} /> {t('common.map')}
            </button>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">{t('action.add_customer')}</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input
            type="text"
            placeholder={t('customer.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-surface-container-lowest border ghost-border rounded-xl text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="All">{t('status.all')}</option>
            <option value="Active">{t('status.active')}</option>
            <option value="Inactive">{t('status.inactive')}</option>
            <option value="Lead">{t('status.lead')}</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-surface-container-lowest border ghost-border rounded-2xl overflow-hidden editorial-shadow">
        {viewMode === 'list' && (
          <>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b ghost-border bg-surface-container-low/50">
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.customer')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.contact_info')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.type')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t('table.status')}</th>
                    <th className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y ghost-border">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} onClick={() => setViewingCustomer(customer)} className="hover:bg-surface-container-lowest/50 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center flex-shrink-0">
                            <Building2 size={20} />
                          </div>
                          <div>
                            <div className="font-medium text-on-surface">{customer.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-on-surface">
                            <User size={14} className="text-outline" />
                            {customer.contact}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                            <Mail size={14} className="text-outline" />
                            {customer.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-container text-on-surface-variant">
                          {customer.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                      ${customer.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                            customer.status === 'Inactive' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'}
                    `}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                        ${customer.status === 'Active' ? 'bg-green-500' :
                              customer.status === 'Inactive' ? 'bg-gray-400' :
                                'bg-blue-500'}
                      `}></span>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenCheckIn(customer); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('action.check_in')}
                          >
                            <MapPin size={18} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(customer); }}
                            className="p-2 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors"
                            title={t('action.edit')}
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                        {t('customer.no_match')} "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col p-4 gap-4 bg-surface">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} onClick={() => setViewingCustomer(customer)} className="bg-surface-container-lowest border ghost-border rounded-2xl p-4 editorial-shadow flex flex-col gap-3 active:scale-[0.99] transition-transform">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center flex-shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-on-surface leading-tight">{customer.name}</div>
                        <span className="text-xs text-on-surface-variant px-2 py-0.5 mt-1 inline-block bg-surface-container rounded-md">
                          {customer.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center gap-2 text-sm text-on-surface">
                      <User size={14} className="text-outline shrink-0" />
                      <span className="truncate">{customer.contact}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Phone size={14} className="text-outline shrink-0" />
                      <span>{customer.phone || 'No phone'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-3 border-t ghost-border">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border
                      ${customer.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                        customer.status === 'Inactive' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                        ${customer.status === 'Active' ? 'bg-green-500' :
                          customer.status === 'Inactive' ? 'bg-gray-400' :
                          'bg-blue-500'}
                      `}></span>
                      {customer.status}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenCheckIn(customer); }}
                        className="p-2 bg-primary-container text-primary hover:bg-primary hover:text-white rounded-lg transition-colors shadow-sm"
                      >
                        <MapPin size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(customer); }}
                        className="p-2 text-outline hover:bg-surface-container rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="text-center py-8 text-on-surface-variant text-sm">
                  {t('customer.no_match')} "{searchTerm}"
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t ghost-border bg-surface-container-low/30 flex items-center justify-between text-sm text-on-surface-variant">
              <div>{t('customer.showing_entries')} {filteredCustomers.length}</div>
            </div>
          </>
        )}
        {viewMode === 'map' && (
          <div className="h-[600px] w-full z-0 relative">
            <MapContainer center={[13.7563, 100.5018]} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredCustomers.map((customer) => {
                let gps = customer.gpsLocation;

                // Smart Fallback: If no GPS in profile, find latest check-in
                if (!gps && checkIns) {
                  const customerCheckIns = checkIns.filter(ci => ci.customer_id === customer.id || ci.customer === customer.name);
                  if (customerCheckIns.length > 0) {
                    // Check-ins are ordered descending by created_at
                    gps = customerCheckIns[0].gps_location;
                  }
                }

                if (!gps) return null;
                const parts = gps.split(',');
                if (parts.length < 2) return null;
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                if (isNaN(lat) || isNaN(lng)) return null;

                return (
                  <Marker key={customer.id} position={[lat, lng]}>
                    <Popup>
                      <div className="w-48">
                        <div className="font-bold text-sm mb-1">{customer.name}</div>
                        <div className="text-xs text-gray-600 mb-1">{customer.typeBu} • {customer.groupBu}</div>
                        <div className="text-xs flex items-center gap-1 text-gray-600 mb-1">
                          <User size={10} /> {customer.contact}
                        </div>
                        <div className="text-xs flex items-center gap-1 text-gray-600 mb-2">
                          <Phone size={10} /> {customer.phone}
                        </div>
                        <button
                          onClick={() => setViewingCustomer(customer)}
                          className="text-xs text-blue-600 hover:underline w-full text-left"
                        >
                          View Full Details
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </div>

      {/* View Customer Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg editorial-shadow overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b ghost-border shrink-0">
              <h2 className="text-xl font-headline font-semibold text-on-surface flex items-center gap-2">
                <Building2 size={24} className="text-primary" />
                {t('customer.details')}
              </h2>
              <button onClick={() => setViewingCustomer(null)} className="text-outline hover:text-on-surface">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary-container/30 text-primary flex items-center justify-center flex-shrink-0">
                  <Building2 size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface">{viewingCustomer.name}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('customer.contact_person')}</span>
                  <div className="flex items-center gap-2 text-sm text-on-surface font-medium">
                    <User size={16} className="text-outline" />
                    {viewingCustomer.contact}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('table.status')}</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                    ${viewingCustomer.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                      viewingCustomer.status === 'Inactive' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'}
                  `}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                      ${viewingCustomer.status === 'Active' ? 'bg-green-500' :
                        viewingCustomer.status === 'Inactive' ? 'bg-gray-400' :
                          'bg-blue-500'}
                    `}></span>
                    {viewingCustomer.status}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('customer.tax_id')}</span>
                  <div className="text-sm text-on-surface">{viewingCustomer.taxId || '-'}</div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('customer.email')}</span>
                  <div className="flex items-center gap-2 text-sm text-on-surface">
                    <Mail size={16} className="text-outline" />
                    {viewingCustomer.email}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('customer.phone')}</span>
                  <div className="flex items-center gap-2 text-sm text-on-surface">
                    <Phone size={16} className="text-outline" />
                    {viewingCustomer.phone}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{t('customer.business_structure')}</span>
                  <div className="text-sm text-on-surface">
                    {viewingCustomer.typeBu || viewingCustomer.type} • {viewingCustomer.groupBu || '-'}
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low p-4 rounded-xl border ghost-border mt-4">
                <span className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MapPin size={16} /> {t('customer.location_details')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs text-outline mb-0.5">{t('customer.address')}</span>
                    <div className="text-sm text-on-surface">{viewingCustomer.address || '-'}</div>
                  </div>
                  <div>
                    <span className="block text-xs text-outline mb-0.5">{t('customer.sub_district')}</span>
                    <div className="text-sm text-on-surface">{viewingCustomer.tambon || '-'}</div>
                  </div>
                  <div>
                    <span className="block text-xs text-outline mb-0.5">{t('customer.district')}</span>
                    <div className="text-sm text-on-surface">{viewingCustomer.district || '-'}</div>
                  </div>
                  <div>
                    <span className="block text-xs text-outline mb-0.5">{t('customer.province')}</span>
                    <div className="text-sm text-on-surface">{viewingCustomer.province || '-'}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block text-xs text-outline mb-0.5">{t('customer.gps')}</span>
                    {viewingCustomer.gpsLocation ? (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingCustomer.gpsLocation)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        {viewingCustomer.gpsLocation}
                      </a>
                    ) : (
                      <span className="text-sm text-on-surface-variant">-</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-6 border-t ghost-border shrink-0 flex justify-end gap-3 bg-surface-container-lowest">
              <button
                onClick={() => {
                  setViewingCustomer(null);
                  handleOpenCheckIn(viewingCustomer);
                }}
                className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full font-medium transition-colors flex items-center gap-2"
              >
                <MapPin size={18} /> Check-in
              </button>
              <button
                onClick={() => {
                  setViewingCustomer(null);
                  handleOpenModal(viewingCustomer);
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Edit2 size={18} /> {t('action.edit_customer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl editorial-shadow overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b ghost-border shrink-0">
              <h2 className="text-xl font-headline font-semibold text-on-surface">
                {editingCustomer ? t('action.edit_customer') : t('action.add_customer')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-outline hover:text-on-surface">
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="customerForm" onSubmit={handleSave} className="space-y-6">

                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">{t('customer.basic_info')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.company_name')} *</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.tax_id')}</label>
                      <input type="text" value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.contact_person')} *</label>
                      <input required type="text" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.email')} *</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.phone')}</label>
                        <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Type */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">{t('customer.business_structure')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.type_bu')}</label>
                      <select value={formData.typeBu} onChange={e => setFormData({ ...formData, typeBu: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm">
                        <option value="บุคคลธรรมดา">บุคคลธรรมดา</option>
                        <option value="บริษัทจำกัด">บริษัทจำกัด</option>
                        <option value="บริษัทมหาชน">บริษัทมหาชน</option>
                        <option value="ห้างหุ้นส่วนจำกัด">ห้างหุ้นส่วนจำกัด</option>
                        <option value="องค์การบริหารส่วนตำบล">องค์การบริหารส่วนตำบล</option>
                        <option value="องค์การบริหารส่วนจังหวัด">องค์การบริหารส่วนจังหวัด</option>
                        <option value="เทศบาลตำบล">เทศบาลตำบล</option>
                        <option value="เทศบาลเมือง">เทศบาลเมือง</option>
                        <option value="เทศบาลนคร">เทศบาลนคร</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.group_bu')}</label>
                      <select value={formData.groupBu} onChange={e => setFormData({ ...formData, groupBu: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm">
                        <option value="การบิน">การบิน</option>
                        <option value="ก่อสร้าง">ก่อสร้าง</option>
                        <option value="เกษตร">เกษตร</option>
                        <option value="ทั่วไป">ทั่วไป</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('table.status')}</label>
                      <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm">
                        <option value="Lead">Lead</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location & Address */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">{t('customer.location_details')}</h3>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <MapPin size={16} />
                      {isLocating ? 'ดึงตำแหน่ง...' : 'ดึงข้อมูลจากตำแหน่งปัจจุบัน'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.gps_coordinates')}</label>
                    <input type="text" readOnly value={formData.gpsLocation} placeholder="Lat, Lng" className="w-full px-4 py-3 bg-surface-container-low border ghost-border rounded-xl text-on-surface-variant outline-none cursor-not-allowed text-base sm:text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.address_details')}</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="House No, Building, Street..." className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none mb-4 text-base sm:text-sm" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.province')}</label>
                      <input type="text" value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.district')}</label>
                      <input type="text" value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('customer.sub_district')}</label>
                      <input type="text" value={formData.tambon} onChange={e => setFormData({ ...formData, tambon: e.target.value })} className="w-full px-4 py-3 bg-surface-container border ghost-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-base sm:text-sm" />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t ghost-border bg-surface-container-lowest shrink-0 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-full font-medium transition-colors">{t('common.cancel')}</button>
              <button type="submit" form="customerForm" disabled={isSubmitting} className="px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white hover:from-[#7c3aed] hover:to-[#c026d3] rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Saving...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {isCheckInModalOpen && checkInCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md editorial-shadow overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b ghost-border shrink-0">
              <h2 className="text-xl font-headline font-semibold text-on-surface">
                {t('checkin.customer_checkin')}
              </h2>
              <button onClick={() => setIsCheckInModalOpen(false)} className="text-outline hover:text-on-surface">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <CheckInForm 
                preselectedCustomerId={checkInCustomer.id} 
                onSuccess={() => {
                  setIsCheckInModalOpen(false);
                  alert('Check-in submitted successfully');
                }}
                onCancel={() => setIsCheckInModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
