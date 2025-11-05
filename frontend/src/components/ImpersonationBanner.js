import { AlertTriangle, LogOut } from 'lucide-react';
import { Button } from './ui/button';

export default function ImpersonationBanner({ companyName, canEdit, onExit }) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg z-50">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-xs sm:text-sm truncate">
                <span className="hidden sm:inline">Viewing </span>"{companyName}" <span className="hidden sm:inline">as </span>Super Admin
              </p>
              <p className="text-xs opacity-90 hidden sm:block">
                {canEdit ? '✓ Full Access' : '👁️ Read-only'}
              </p>
            </div>
          </div>
          <Button
            onClick={onExit}
            variant="outline"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50 flex items-center gap-1 flex-shrink-0 text-xs px-2 py-1"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
