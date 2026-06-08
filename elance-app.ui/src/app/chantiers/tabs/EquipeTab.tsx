import { PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const ROLES = ['Chef de chantier', 'Ouvrier qualifié', 'Manœuvre'];
const EMPLOYEES = [
  { role: 'Chef de chantier', firstName: 'Sami', lastName: 'Ben Ali', joinedAt: '2025-05-12T10:00:00Z' },
  { role: 'Ouvrier qualifié', firstName: 'Karim', lastName: 'Trabelsi', joinedAt: '2025-06-01T10:00:00Z' },
];

export function EquipeTab({ site }: { site: any }) {
  return (
    <div className="flex flex-col gap-8">
      {ROLES.map(role => {
        const emps = EMPLOYEES.filter(e => e.role === role);
        return (
          <div key={role} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#2563eb]" />
                <h3 className="text-lg font-bold text-[#1a1a1a] m-0">{role}</h3>
                <span className="bg-[#f0f0f0] text-[#888780] text-xs font-bold px-2 py-0.5 rounded-full">{emps.length}</span>
              </div>
              <Button variant="ghost" size="icon" className="bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] rounded-full" title={`Ajouter un ${role}`}>
                <PlusCircle className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {emps.map((emp, i) => (
                <div key={i} className="flex items-center p-4 bg-white border border-black/5 shadow-sm rounded-2xl hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div className="flex-1 ml-3 overflow-hidden">
                    <div className="font-semibold text-[#1a1a1a] text-sm truncate">{emp.firstName} {emp.lastName}</div>
                    <div className="text-[0.7rem] text-[#888780]">Rejoint le {new Date(emp.joinedAt).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe]">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem className="font-semibold cursor-pointer"><Edit className="w-4 h-4 mr-2"/> Modifier</DropdownMenuItem>
                      <DropdownMenuItem className="font-semibold text-red-600 focus:text-red-600 cursor-pointer"><Trash2 className="w-4 h-4 mr-2"/> Retirer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {emps.length === 0 && (
                <div className="col-span-full p-6 text-center border border-dashed border-black/10 rounded-2xl text-[#888780] font-medium text-sm">
                  Aucun {role} assigné
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
