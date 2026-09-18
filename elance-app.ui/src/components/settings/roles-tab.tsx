'use client';

import * as React from 'react';
import { 
  useEmployeeRoles, 
  useUpdateEmployeeRoles 
} from '@/hooks/use-employee-roles';
import { EmployeeRole } from '@/types/team';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function RolesTab() {
  const { roles, isLoading, refetch } = useEmployeeRoles();
  const updateRolesMutation = useUpdateEmployeeRoles();

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<EmployeeRole | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formIsActive, setFormIsActive] = React.useState(true);

  // Delete Confirm State
  const [roleToDelete, setRoleToDelete] = React.useState<EmployeeRole | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Search/Filter
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredRoles = React.useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [roles, searchQuery]);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setFormName('');
    setFormIsActive(true);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (role: EmployeeRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormIsActive(role.isActive);
    setIsDialogOpen(true);
  };

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) {
      toast.error('Le nom de la fonction est requis.');
      return;
    }

    // Check duplicate name (case-insensitive, excluding current editing role)
    const duplicate = roles.some(
      (r) =>
        r.name.toLowerCase() === trimmed.toLowerCase() &&
        (!editingRole || r.id !== editingRole.id)
    );
    if (duplicate) {
      toast.error(`Une fonction intitulée "${trimmed}" existe déjà.`);
      return;
    }

    let updatedRoles: EmployeeRole[];

    if (editingRole) {
      // Update existing role
      updatedRoles = roles.map((r) =>
        r.id === editingRole.id
          ? { ...r, name: trimmed, isActive: formIsActive }
          : r
      );
    } else {
      // Generate unique stable slug
      let slug = generateSlug(trimmed) || `role-${Date.now()}`;
      let counter = 1;
      while (roles.some((r) => r.id === slug)) {
        slug = `${generateSlug(trimmed)}-${counter++}`;
      }

      // Assign next positive integer code >= 100
      const existingCodes = roles
        .map((r) => r.code)
        .filter((c): c is number => typeof c === 'number' && c > 0);
      const nextCode = existingCodes.length > 0 ? Math.max(...existingCodes, 99) + 1 : 100;

      const newRole: EmployeeRole = {
        id: slug,
        code: nextCode,
        name: trimmed,
        isActive: formIsActive,
      };

      updatedRoles = [...roles, newRole];
    }

    try {
      await updateRolesMutation.mutateAsync({ roles: updatedRoles });
      setIsDialogOpen(false);
      setEditingRole(null);
      setFormName('');
    } catch (err) {
      // Error handled by mutation onError
    }
  };

  const handleToggleActive = async (role: EmployeeRole, active: boolean) => {
    const updatedRoles = roles.map((r) =>
      r.id === role.id ? { ...r, isActive: active } : r
    );
    await updateRolesMutation.mutateAsync({ roles: updatedRoles });
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;

    const updatedRoles = roles.filter((r) => r.id !== roleToDelete.id);
    try {
      await updateRolesMutation.mutateAsync({ roles: updatedRoles });
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    } catch (err) {
      // Backend conflict handled by mutation
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Card */}
      <div className="bg-white border border-corp-blue-50/50 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-corp-blue-600 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Paramètres Collaborateurs & RH
          </div>
          <h2 className="text-2xl font-bold text-corp-blue-900 tracking-tight">
            Fonctions / Postes des Collaborateurs
          </h2>
          <p className="text-sand-400 text-sm leading-relaxed">
            Configurez les intitulés de postes et fonctions opérationnelles disponibles
            lors de la création ou de la modification des collaborateurs dans votre entreprise.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-12 px-6 bg-corp-blue-600 hover:bg-corp-blue-800 text-white font-bold rounded-xl shadow-lg shadow-corp-blue-600/20 gap-2 shrink-0 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Ajouter une fonction
        </Button>
      </div>

      {/* Roles List Table */}
      <div className="bg-white border border-corp-blue-50/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-corp-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-corp-blue-600" />
            <span className="font-bold text-corp-blue-900 text-sm">
              Fonctions Configurées ({roles.length})
            </span>
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Filtrer les fonctions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-xl text-xs bg-sand-50/50 border-corp-blue-100"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sand-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-corp-blue-600" />
            <p className="text-sm font-medium">Chargement des fonctions...</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-12 text-center text-sand-400">
            <p className="text-sm font-medium">Aucune fonction trouvée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sand-50/40 border-b border-corp-blue-50/50">
                  <th className="p-4 pl-6 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">
                    Fonction / Poste
                  </th>
                  <th className="p-4 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">
                    Identifiant
                  </th>
                  <th className="p-4 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">
                    Statut
                  </th>
                  <th className="p-4 pr-6 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corp-blue-50/50">
                {filteredRoles.map((role) => (
                  <tr
                    key={role.id}
                    className="hover:bg-corp-blue-50/20 transition-colors group"
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-corp-blue-50 text-corp-blue-700 flex items-center justify-center font-bold text-sm">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-corp-blue-900 text-sm">
                            {role.name}
                          </div>
                          <div className="text-[0.7rem] text-sand-400 font-mono mt-0.5">
                            Code: {role.code ?? 'Auto'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-xs bg-sand-50 px-2 py-1 rounded text-sand-600 font-mono border border-corp-blue-50">
                        {role.id}
                      </code>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <Switch
                          checked={role.isActive}
                          onCheckedChange={(checked) => handleToggleActive(role, checked)}
                          disabled={updateRolesMutation.isPending}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                        <span
                          className={cn(
                            'text-xs font-bold',
                            role.isActive ? 'text-emerald-600' : 'text-sand-400'
                          )}
                        >
                          {role.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(role)}
                          className="h-8 w-8 text-sand-400 hover:text-corp-blue-600 hover:bg-corp-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRoleToDelete(role);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 text-sand-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-corp-blue-100 p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-corp-blue-50 text-corp-blue-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-corp-blue-900">
                {editingRole ? 'Modifier la fonction' : 'Ajouter une fonction'}
              </DialogTitle>
            </div>
            <p className="text-xs text-sand-400">
              {editingRole
                ? 'Modifiez l\'intitulé ou la disponibilité de cette fonction.'
                : 'Créez une nouvelle fonction métier pour vos collaborateurs.'}
            </p>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="role-name" className="text-xs font-bold text-sand-400 uppercase tracking-widest">
                Nom de la fonction
              </Label>
              <Input
                id="role-name"
                placeholder="Ex: Responsable Achat, Commercial..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
                className="h-11 rounded-xl font-bold text-corp-blue-900 border-corp-blue-100 focus:border-corp-blue-600"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-sand-50/50 rounded-xl border border-corp-blue-50">
              <div className="space-y-0.5">
                <Label htmlFor="role-active" className="text-sm font-bold text-corp-blue-900 cursor-pointer">
                  Fonction active
                </Label>
                <p className="text-[0.7rem] text-sand-400">
                  Visible et sélectionnable lors de la création d'un collaborateur.
                </p>
              </div>
              <Switch
                id="role-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="h-11 px-5 font-bold text-sand-400 hover:bg-sand-50 rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={updateRolesMutation.isPending}
                className="h-11 px-6 bg-corp-blue-600 hover:bg-corp-blue-800 text-white font-bold rounded-xl shadow-md gap-2"
              >
                {updateRolesMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Deactivate Confirm Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-corp-blue-100 p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-corp-blue-900">
                Supprimer la fonction
              </DialogTitle>
            </div>
            <p className="text-sm text-sand-400 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement la fonction{' '}
              <strong className="text-corp-blue-900 font-bold">"{roleToDelete?.name}"</strong> ?
            </p>
            <p className="text-xs text-sand-400 bg-sand-50 p-3 rounded-xl border border-corp-blue-50 mt-2">
              <span className="font-bold text-corp-blue-900">Note :</span> Si des collaborateurs utilisent actuellement cette fonction, la suppression sera bloquée pour préserver vos données existantes. Dans ce cas, nous vous recommandons de simplement la désactiver.
            </p>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-4 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (roleToDelete) {
                  await handleToggleActive(roleToDelete, false);
                  setIsDeleteDialogOpen(false);
                  setRoleToDelete(null);
                  toast.success(`Fonction "${roleToDelete.name}" désactivée.`);
                }
              }}
              className="h-11 font-bold text-corp-blue-700 border-corp-blue-100 hover:bg-corp-blue-50 rounded-xl"
            >
              Désactiver à la place
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={updateRolesMutation.isPending}
              className="h-11 font-bold rounded-xl gap-2"
            >
              {updateRolesMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
