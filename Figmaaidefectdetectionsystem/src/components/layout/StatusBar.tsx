import { Server, Wifi, Shield, Home, Activity } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const StatusBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getButtonClass = (path: string) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-1 px-2 py-0.5 border rounded-sm text-[9px] transition-colors ${
      isActive 
        ? 'bg-white text-black border-white font-bold' 
        : 'border-white/40 hover:bg-white hover:text-black text-white'
    }`;
  };

  return (
    <div className="h-6 bg-black text-white flex items-center justify-between px-3 text-[10px] uppercase tracking-wider shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1"><Server className="w-3 h-3" /> SERVER: ONLINE (42ms)</span>
        <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> SIGNAL: STRONG</span>
      </div>
      <div className="flex items-center gap-3">
        <span>
          USER: OPERATOR_01 | SESSION: #882910
        </span>
        <div className="flex items-center gap-2 mr-2 border-r border-white/20 pr-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className={getButtonClass('/')}
          >
            <Home className="w-3 h-3" />
            现代仪表盘
          </button>
          <button
            type="button"
            onClick={() => navigate('/TraditionalMode')}
            className={getButtonClass('/TraditionalMode')}
          >
            <Activity className="w-3 h-3" />
            传统仪表盘
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/BackendManagement')}
          className={getButtonClass('/BackendManagement')}
        >
          <Shield className="w-3 h-3" />
          后台管理 V1.0.0
        </button>
        <span className="ml-2 text-[9px] text-[#58a6ff]">© 2026 北科工研 BKVISION V1.0.0</span>
      </div>
    </div>
  );
};
