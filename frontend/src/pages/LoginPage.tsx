import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError('');
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Globe Logo from user's Image 1 */}
        <div className="flex justify-center mb-3">
          <img
            src="/safal-globe-logo.png"
            alt="SAFAL Global Logo"
            className="h-24 w-auto object-contain rounded-2xl shadow-md bg-white p-2 border border-emerald-100"
          />
        </div>

        {/* Clean Company Name matching user's Image 2 */}
        <h1 className="text-3xl font-black text-[#064D2B] font-['Manrope'] tracking-tight">
          SAFAL
        </h1>
        <p className="text-sm font-black tracking-wider text-[#D32F2F] uppercase mt-0.5 font-['Manrope']">
          EXPORT AND IMPORT PVT LTD
        </p>
        <p className="text-xs font-semibold text-[#185B30] tracking-wide mt-1">
          Fruits Import &amp; Export · Freshness Beyond Borders
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-[#D7E9DB] sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1B2B21]">Official Email Address</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 text-xs border border-gray-300 rounded-xl focus:border-[#087A3E] focus:outline-none focus:ring-1 focus:ring-[#087A3E]"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B2B21]">Password</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-9 py-2.5 text-xs border border-gray-300 rounded-xl focus:border-[#087A3E] focus:outline-none focus:ring-1 focus:ring-[#087A3E]"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-gradient-to-r from-[#087A3E] to-[#064D2B] hover:opacity-95 focus:outline-none transition disabled:opacity-50"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'} <ArrowRight size={15} />
              </button>
            </div>
          </form>

          {/* Real-world production governance note */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              <strong>SAFAL Internal Operations Portal</strong> · Strictly for authorized personnel.
              Accountant and employee accounts are provisioned by Administration.
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 flex items-center justify-center gap-1">
          <ShieldCheck size={14} className="text-[#087A3E]" /> Enterprise Secure RBAC Authentication
        </p>
      </div>
    </div>
  );
};
