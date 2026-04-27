import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Lock, ArrowRight, Building2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email.trim())
        .single();

      if (error || !data) {
        throw new Error('ไม่พบอีเมลนี้ในระบบ (Email not found)');
      }

      if (String(data.password_hash).trim() !== String(password).trim()) {
        throw new Error('รหัสผ่านไม่ถูกต้อง (Invalid password)');
      }

      // Navigate to dashboard on success
      sessionStorage.setItem('crm_session', JSON.stringify(data));
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#8b5cf6] to-[#d946ef] flex items-center justify-center p-4 sm:p-8 font-headline">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[550px]">

        {/* Left Pane - Branding */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 p-12 bg-gradient-to-br from-[#8b5cf6] to-[#d946ef] text-white relative">
          <div className="w-24 h-24 border-2 border-white/30 rounded-full flex items-center justify-center mb-6 shadow-inner bg-white/5 backdrop-blur-sm">
            <Building2 className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3 drop-shadow-md">CRM System</h1>
          <p className="text-center text-white/90 text-sm leading-relaxed max-w-xs drop-shadow-sm font-light">
            ระบบจัดการข้อมูลลูกค้า
          </p>
          <div className="mt-8 border-t border-white/20 pt-4 w-32 text-center">
            <span className="text-xs text-white/70 font-medium tracking-wide">Version 1.0</span>
          </div>
        </div>

        {/* Right Pane - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ยินดีต้อนรับกลับมา!</h2>
            <p className="text-sm text-gray-500">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-[#d946ef]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent outline-none text-sm transition-all bg-gray-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#d946ef]" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent outline-none text-sm transition-all bg-gray-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3] text-white rounded-full font-medium shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 group mt-8 disabled:opacity-70"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  เข้าสู่ระบบ <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-[10px] text-gray-400">© 2026 CRM Systems.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
