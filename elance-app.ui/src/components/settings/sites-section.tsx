'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Trash2, Loader2, Store } from 'lucide-react';
import { useSites, useDeleteSite } from '@/hooks/use-enterprise';
import { Badge } from '@/components/ui/badge';
import { SiteFormDialog } from './site-form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SitesSection({ enterpriseId }: { enterpriseId: number }) {
  const { data: sites, isLoading } = useSites();
  const deleteSite = useDeleteSite();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-forest-600" />
      </div>
    );
  }

  return (
    <section className="grid lg:grid-cols-3 gap-8">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-forest-900 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-forest-50 text-forest-600">
            <MapPin className="w-5 h-5" />
          </div>
          Points de Vente & Dépôts
        </h3>
        <p className="text-[0.9rem] text-sand-400 font-medium leading-relaxed">
          Gérez vos différents sites d'exploitation et points de vente.
        </p>
      </div>
      <Card className="lg:col-span-2 border-forest-100 rounded-[24px] shadow-sm bg-white overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-forest-900 font-bold flex items-center gap-2">
              <Store className="w-4 h-4 text-forest-500" />
              Liste des Sites ({sites?.length || 0})
            </h4>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold h-10 gap-2 shadow-md shadow-forest-600/10"
            >
              <Plus className="w-4 h-4" /> Ajouter un site
            </Button>
          </div>

          <div className="rounded-xl border border-forest-50 overflow-hidden bg-sand-50/30">
            <Table>
              <TableHeader>
                <TableRow className="bg-forest-50/50 hover:bg-forest-50/50 border-forest-50">
                  <TableHead className="text-forest-900 font-bold w-[100px]">#</TableHead>
                  <TableHead className="text-forest-900 font-bold">Adresse</TableHead>
                  <TableHead className="text-forest-900 font-bold">Gouvernorat</TableHead>
                  <TableHead className="text-forest-900 font-bold">Type</TableHead>
                  <TableHead className="text-forest-900 font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-sand-400 font-medium italic">
                      Aucun site configuré.
                    </TableCell>
                  </TableRow>
                ) : (
                  sites?.map((site, index) => (
                    <TableRow key={site.id} className="hover:bg-white transition-colors border-forest-50">
                      <TableCell className="font-bold text-forest-600">#{index + 1}</TableCell>
                      <TableCell className="text-forest-900 font-medium">{site.address}</TableCell>
                      <TableCell className="text-sand-600 font-medium">{site.gov}</TableCell>
                      <TableCell>
                        {site.isForsale ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-2.5 py-0.5 rounded-lg">Vente</Badge>
                        ) : (
                          <Badge variant="outline" className="text-sand-500 border-sand-100 font-bold px-2.5 py-0.5 rounded-lg">Dépôt</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger 
                          render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                          <AlertDialogContent className="rounded-[24px] border-forest-100">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-forest-900 font-bold">Supprimer ce site ?</AlertDialogTitle>
                              <AlertDialogDescription className="text-sand-500 font-medium">
                                Cette action est irréversible. Le site "{site.address}" sera définitivement retiré de votre configuration.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl border-forest-100 font-bold">Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteSite.mutate(site.id)}
                                className="rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold"
                              >
                                {deleteSite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SiteFormDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        enterpriseId={enterpriseId}
      />
    </section>
  );
}
