'use client';

import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Save, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { AppUser } from '@/types/team';
import { useUserPermissions, useUpdateUserPermissions } from '@/hooks/use-permissions';
import { AppPermissionsMap, PERMISSION_MODULES, PermissionModuleKey } from '@/types/permissions';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
}

const DEFAULT_PERMISSIONS: AppPermissionsMap = {
  analytics: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  articles: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  customers: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  providers: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  purchases: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  sales: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  stock: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  inventory: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  accounting: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  vehicles: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  hr: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
  configuration: { canRead: true, canAdd: false, canUpdate: false, canDelete: false },
};

export function PermissionsDialog({ isOpen, onClose, user }: PermissionsDialogProps) {
  const [permissions, setPermissions] = useState<AppPermissionsMap>(DEFAULT_PERMISSIONS);
  
  const { data: userPermsData, isLoading: isLoadingPerms, isFetching } = useUserPermissions(user?.id || 0);
  const updatePermissionsMutation = useUpdateUserPermissions();

  useEffect(() => {
    if (userPermsData?.permissions && Object.keys(userPermsData.permissions).length > 0) {
      setPermissions({ ...DEFAULT_PERMISSIONS, ...userPermsData.permissions });
    } else {
      setPermissions({ ...DEFAULT_PERMISSIONS });
    }
  }, [userPermsData, isOpen]);

  const handleToggle = (module: PermissionModuleKey, action: keyof AppPermissionsMap[PermissionModuleKey]) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action]
      }
    }));
  };

  const handleGrantAll = (module: PermissionModuleKey) => {
    setPermissions(prev => ({
      ...prev,
      [module]: { canRead: true, canAdd: true, canUpdate: true, canDelete: true }
    }));
  };

  const handleRevokeAll = (module: PermissionModuleKey) => {
    setPermissions(prev => ({
      ...prev,
      [module]: { canRead: false, canAdd: false, canUpdate: false, canDelete: false }
    }));
  };

  const handleSave = () => {
    if (!user) return;
    updatePermissionsMutation.mutate(
      { userId: user.id, data: { userId: user.id, permissions } },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1200px] max-w-[95vw] w-[95vw] bg-sand-50/95 backdrop-blur-md border-corp-blue-100/50 shadow-2xl p-0 overflow-hidden rounded-xl">
        <div className="bg-white border-b border-corp-blue-50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-corp-blue-600 text-white flex items-center justify-center shadow-lg shadow-corp-blue-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-corp-blue-900">
                Gestion des Permissions
              </DialogTitle>
              <p className="text-sm font-medium text-sand-500 mt-0.5">
                Utilisateur: <span className="font-bold text-corp-blue-700">{user?.login}</span> 
                {user?.person && ` (${user.person.firstname} ${user.person.lastname})`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {isLoadingPerms || isFetching ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {PERMISSION_MODULES.map((mod, index) => {
                  const modKey = mod.key as PermissionModuleKey;
                  const modPerms = permissions[modKey];
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={mod.key}
                      className="bg-white border border-corp-blue-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-corp-blue-50">
                        <h4 className="font-bold text-corp-blue-900 flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 rounded-full bg-corp-blue-50 flex items-center justify-center text-corp-blue-600">
                            {/* Icon mapping could go here, fallback to ShieldCheck */}
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          {mod.label}
                        </h4>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[0.65rem] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 rounded-lg"
                            onClick={() => handleGrantAll(modKey)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> TOUT
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[0.65rem] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 rounded-lg"
                            onClick={() => handleRevokeAll(modKey)}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> AUCUN
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-sand-600">Lecture</span>
                          <Switch 
                            checked={modPerms?.canRead || false} 
                            onCheckedChange={() => handleToggle(modKey, 'canRead')} 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-sand-600">Ajout</span>
                          <Switch 
                            checked={modPerms?.canAdd || false} 
                            onCheckedChange={() => handleToggle(modKey, 'canAdd')} 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-sand-600">Modification</span>
                          <Switch 
                            checked={modPerms?.canUpdate || false} 
                            onCheckedChange={() => handleToggle(modKey, 'canUpdate')} 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-sand-600">Suppression</span>
                          <Switch 
                            checked={modPerms?.canDelete || false} 
                            onCheckedChange={() => handleToggle(modKey, 'canDelete')} 
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <DialogFooter className="bg-white border-t border-corp-blue-50 p-6 rounded-b-[24px]">
          <div className="flex w-full justify-between items-center">
            <p className="text-xs text-sand-400 font-medium flex items-center gap-2">
              <RefreshCw className="w-3 h-3" /> Les modifications s'appliqueront à la prochaine connexion
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="font-bold h-11 px-6">
                Annuler
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updatePermissionsMutation.isPending}
                className="bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold h-11 px-6 shadow-lg shadow-corp-blue-600/20"
              >
                {updatePermissionsMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


