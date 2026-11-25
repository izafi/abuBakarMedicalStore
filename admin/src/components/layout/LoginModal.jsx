import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { APP_INFO, USER_ROLES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { authService } from '../../services/authService';
import { alert } from '../../utils/sweetAlert';

export const LoginModal = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { settings } = useSettings();

  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [identifier, setIdentifier] = useState('huzaifazafi156@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('huzaifazafi156@gmail.com');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');

  if (isAuthenticated) return null;

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or username');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      const user = await login(identifier.trim(), password);
      alert.toast(`Welcome back, ${user?.name || 'Administrator'}!`, 'success');

      // If logging in as an employee, land directly on Billing & POS
      if (user?.role && user.role !== USER_ROLES.ADMIN) {
        navigate('/pos', { replace: true });
      }
    } catch (err) {
      console.error('[Login] Authentication failed:', err);
      const msg = err.data?.message || err.message || 'Invalid credentials. Please verify your email and password.';
      setErrorMessage(msg);
      alert.error('Sign In Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password submission
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setForgotSuccess('');

    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered email address');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setErrorMessage('New password must be at least 4 characters long');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type your new password.');
      return;
    }

    try {
      setIsForgotLoading(true);
      const res = await authService.forgotPassword({
        email: forgotEmail.trim(),
        newPassword: newPassword ? newPassword.trim() : undefined,
      });

      if (newPassword) {
        setForgotSuccess(res.message || 'Password reset successfully! You can now sign in.');
        alert.success('Password Reset Complete', 'Your password has been updated. Please sign in.');
        setTimeout(() => {
          setPassword(newPassword);
          setMode('login');
          setForgotSuccess('');
        }, 1800);
      } else {
        setForgotSuccess(res.message || 'Account verified! Enter your new password below.');
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Could not verify account with this email.';
      setErrorMessage(msg);
      alert.error('Reset Failed', msg);
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#07241A]/85 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl border border-emerald-900/10 overflow-hidden flex flex-col">
        {/* Brand Header */}
        <div className="px-5 py-4 bg-gradient-to-br from-[#0F3A2C] via-[#144D3A] to-[#0A291F] text-white text-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#1C9A58]/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-emerald-400/10 rounded-full blur-2xl" />

          {/* Medical Cross Brand Icon */}
          <div className="w-10 h-10 rounded-xl bg-[#1C9A58] mx-auto flex items-center justify-center shadow-md shadow-emerald-950/40 mb-2 border border-emerald-400/30">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>

          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
            {settings?.storeName || APP_INFO.NAME}
          </h2>
          <p className="text-[10px] text-[#A3D9BE] font-bold tracking-wider uppercase mt-0.5">
            {settings?.tagline || APP_INFO.TAGLINE}
          </p>

          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] text-emerald-200 font-semibold border border-white/10">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Station Access Authentication</span>
          </div>
        </div>

        {/* Dynamic Authentication Form */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          {mode === 'login' ? (
            /* --- LOGIN MODE --- */
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Email / Staff Username
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Admin Access
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. huzaifazafi156@gmail.com"
                    autoComplete="username"
                    required
                    className="w-full h-9 pl-9 pr-3 text-xs font-semibold text-black bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:border-[#1C9A58] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage('');
                    }}
                    className="text-[11px] font-bold text-[#1C9A58] hover:text-[#0F3A2C] transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter station password"
                    autoComplete="current-password"
                    required
                    className="w-full h-9 pl-9 pr-9 text-xs font-semibold text-black bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:border-[#1C9A58] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Credentials hint */}
              <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-slate-700 text-[11px] font-medium flex items-center justify-between">
                <span className="font-bold text-emerald-900">Admin Credentials:</span>
                <span className="font-mono text-emerald-800 font-bold">admin1234</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-9.5 rounded-lg bg-[#1C9A58] hover:bg-[#0F3A2C] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Station</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* --- FORGOT PASSWORD MODE --- */
            <form onSubmit={handleForgotSubmit} className="space-y-2.5">
              <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <KeyRound className="w-3.5 h-3.5 text-[#1C9A58]" />
                <h3 className="text-xs sm:text-sm font-bold text-black">Reset Account Password</h3>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Enter registered administrator email to set a new password.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-0.5">
                  Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. huzaifazafi156@gmail.com"
                    required
                    className="w-full h-9 pl-9 pr-3 text-xs font-semibold text-black bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-0.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 4 characters"
                    required
                    className="w-full h-9 pl-9 pr-9 text-xs font-semibold text-black bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-0.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full h-9 pl-9 pr-9 text-xs font-semibold text-black bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Status alerts */}
              {errorMessage && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {forgotSuccess && (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1C9A58] shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="flex-1 h-9 rounded-lg bg-[#1C9A58] hover:bg-[#0F3A2C] text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isForgotLoading ? 'Resetting...' : 'Save New Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1C9A58]" />
            <span>Secure 256-Bit Encrypted Pharmacy Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
