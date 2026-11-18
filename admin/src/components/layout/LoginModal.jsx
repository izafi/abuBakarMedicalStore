import { Cross, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { APP_INFO, USER_ROLES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../common/Badge';

export const LoginModal = () => {
  const { users, login, isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  const getRoleBadgeVariant = (role) => {
    if (role === USER_ROLES.ADMIN) return 'primary';
    if (role === USER_ROLES.PHARMACIST) return 'info';
    return 'default';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F3A2C]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Brand Header */}
        <div className="p-6 bg-[#0F3A2C] text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-[#1C9A58] mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/40 mb-3">
            <Cross className="w-8 h-8 text-white rotate-45" />
          </div>
          <h2 className="text-xl font-extrabold tracking-wide text-white">
            {APP_INFO.NAME}
          </h2>
          <p className="text-xs text-[#A3D9BE] font-bold tracking-widest uppercase mt-0.5">
            {APP_INFO.TAGLINE}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs text-emerald-200 font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Counter Station Locked</span>
          </div>
        </div>

        {/* Content & Account Selection */}
        <div className="p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Select Staff Profile to Unlock:
          </p>

          <div className="space-y-2.5">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => login(user.id)}
                className="w-full p-3.5 rounded-2xl border border-gray-200 hover:border-[#1C9A58] hover:bg-emerald-50/30 transition-all duration-150 flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E8F6EF] text-[#1C9A58] border border-[#BDE8D2] flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#1C9A58] transition-colors">
                      {user.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400 font-mono">
                        @{user.username}
                      </span>
                      <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#1C9A58] group-hover:text-white flex items-center justify-center text-gray-400 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-[#1C9A58]" />
            <span>Encrypted Offline LocalStorage Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
