import { MapPin, Phone, Mail, UserPlus, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GeneralTab({ site }: { site: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column */}
      <div className="flex flex-col gap-6">
        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">À propos du projet</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-[#888780] leading-relaxed mb-6">
              {site.description || "Aucune description fournie pour ce chantier. Ce projet consiste en la construction/rénovation selon les plans approuvés."}
            </p>
            
            <div className="bg-[#fdfdfd] border-l-4 border-[#2563eb] p-4 rounded-r-xl flex items-start gap-3">
              <StickyNote className="w-5 h-5 text-[#2563eb] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb] block mb-1">Note interne</span>
                <p className="text-sm text-[#1a1a1a] font-medium">
                  {site.internalNote || "Priorité haute sur le gros œuvre avant la fin du mois."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Localisation</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[200px] bg-[#f0f0f0] rounded-xl flex flex-col items-center justify-center text-[#888780] border border-black/5">
              <MapPin className="w-8 h-8 opacity-40 mb-2" />
              <span className="font-semibold">Visualisation de la carte</span>
              <small className="mt-1">{site.location}</small>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-6">
        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Architecte</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {site.architect ? (
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-[#f8f9fa] border-2 border-[#f0f0f0] flex items-center justify-center text-[#1a1a1a] text-xl font-bold">
                  {site.architect.firstName[0]}{site.architect.lastName?.[0]}
                </div>
                <div>
                  <div className="font-bold text-lg text-[#1a1a1a]">{site.architect.firstName} {site.architect.lastName}</div>
                  <div className="text-sm text-[#888780] mb-3">{site.architect.company || 'Indépendant'}</div>
                  <div className="flex gap-4">
                    <a href="#" className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a] hover:text-[#2563eb] transition-colors">
                      <Phone className="w-4 h-4" /> Appeler
                    </a>
                    <a href="#" className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a] hover:text-[#2563eb] transition-colors">
                      <Mail className="w-4 h-4" /> Email
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-[#888780]">
                <UserPlus className="w-10 h-10 opacity-20 mb-3" />
                <span className="font-semibold mb-4">Aucun architecte assigné</span>
                <Button className="bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] font-bold rounded-xl px-6">
                  Assigner maintenant
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a]">Échéancier</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center p-4 rounded-xl bg-[#f8f9fa] border border-[#f0f0f0]">
                <span className="text-sm font-bold uppercase tracking-wider text-[#888780]">Début</span>
                <span className="font-semibold text-[#1a1a1a]">
                  {new Date(site.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-[#f8f9fa] border border-[#f0f0f0]">
                <span className="text-sm font-bold uppercase tracking-wider text-[#888780]">Fin estimée</span>
                <span className="font-semibold text-[#1a1a1a]">
                  {site.estimatedEndDate ? new Date(site.estimatedEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non définie'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
