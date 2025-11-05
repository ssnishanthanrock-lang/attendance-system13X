import { AlertTriangle, LogOut } from 'lucide-react';
import { Button } from './ui/button';

export default function ImpersonationBanner({ companyName, canEdit, onExit }) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg z-50 lg:left-72">
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm sm:text-base">
                Viewing "{companyName}" Portal as Super Admin
              </p>
              <p className="text-xs opacity-90">
                Access Mode: {canEdit ? '✓ Full Access (Can Edit/Add/Delete)' : '👁️ Read-only (View Only)'}
              </p>
            </div>
          </div>
          <Button
            onClick={onExit}
            variant="outline"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Exit & Return to Super Admin
          </Button>
        </div>
      </div>
    </div>
  );
}
