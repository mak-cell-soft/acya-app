import React, { useState } from 'react';
import { MapPin, Phone, Mail, UserPlus, StickyNote, Calendar, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChantierDetail } from '@/types/chantier';

interface GeneralTabProps {
  site: ChantierDetail;
  onAssignArchitect?: () => void;
}

/**
 * GeneralTab: Project summary, internal notes, architect contact, location, and key milestones.
 * Consumes real ChantierDetail data from GET /api/chantier/{id}.
 */
export function GeneralTab({ site, onAssignArchitect }: GeneralTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-['Outfit',sans-serif]">
      {/* Left Column: Overview & Notes & Location */}
      <div className="flex flex-col gap-6">
        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">À propos du projet</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-[#666] leading-relaxed mb-6 whitespace-pre-line">
              {site.description || "Aucune description fournie pour ce chantier. Ce projet consiste en la construction/rénovation selon les plans approuvés."}
            </p>
            
            <div className="bg-[#f8faff] border-l-4 border-[#2563eb] p-4 rounded-r-xl flex items-start gap-3">
              <StickyNote className="w-5 h-5 text-[#2563eb] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb] block mb-1">Note interne</span>
                <p className="text-sm text-[#1a1a1a] font-medium">
                  {site.internalNote || "Aucune consigne interne particulière pour ce site."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Localisation</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[180px] bg-[#f8f9fa] rounded-xl flex flex-col items-center justify-center text-[#888780] border border-black/5 p-4 text-center">
              <MapPin className="w-8 h-8 text-[#2563eb] opacity-60 mb-2" />
              <span className="font-bold text-[#1a1a1a] text-base">{site.location || "Emplacement non renseigné"}</span>
              {site.gouvernorate && (
                <span className="text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-2.5 py-1 rounded-full mt-2">
                  {site.gouvernorate}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Architect & Timeline & Budget */}
      <div className="flex flex-col gap-6">
        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Architecte & Direction de Projet</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {site.architectName ? (
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-[#eff6ff] border-2 border-[#bfdbfe] flex items-center justify-center text-[#2563eb] text-xl font-extrabold shadow-sm">
                  {site.architectName[0]}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg text-[#1a1a1a]">{site.architectName}</div>
                  <div className="text-xs font-medium text-[#888780] mb-3">Architecte référent du chantier</div>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-3 py-1.5 rounded-lg">
                      <Phone className="w-3.5 h-3.5" /> Affecté
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-[#888780]">
                <UserPlus className="w-10 h-10 opacity-20 mb-3" />
                <span className="font-semibold mb-2 text-sm">Aucun architecte assigné</span>
                <span className="text-xs text-[#888780] mb-4 text-center max-w-[260px]">
                  Vous pouvez affecter une personne du carnet de contacts comme architecte référent.
                </span>
                {onAssignArchitect && (
                  <Button onClick={onAssignArchitect} className="bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] font-bold rounded-xl px-5 text-xs">
                    Assigner un architecte
                  </Button>
                )}
              </div>
            )}

            {site.projectManagerName && (
              <div className="mt-6 pt-6 border-t border-black/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-black/10 flex items-center justify-center text-[#1a1a1a] font-bold text-sm">
                  {site.projectManagerName[0]}
                </div>
                <div>
                  <div className="text-xs text-[#888780] font-semibold uppercase">Chef de Projet</div>
                  <div className="text-sm font-bold text-[#1a1a1a]">{site.projectManagerName}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Échéancier & Budget</CardTitle>
            <Calendar className="w-5 h-5 text-[#888780]" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f8f9fa] border border-[#f0f0f0]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#888780]">Date de début</span>
                <span className="font-semibold text-sm text-[#1a1a1a]">
                  {new Date(site.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f8f9fa] border border-[#f0f0f0]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#888780]">Fin estimée</span>
                <span className="font-semibold text-sm text-[#1a1a1a]">
                  {site.plannedEndDate ? new Date(site.plannedEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non définie'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f8faff] border border-[#bfdbfe]/40">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb] flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Budget Total
                </span>
                <span className="font-extrabold text-base text-[#2563eb]">
                  {site.budgetTotal ? `${site.budgetTotal.toLocaleString('fr-FR')} TND` : 'Non renseigné'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
