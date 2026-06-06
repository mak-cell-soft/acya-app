import { PublicNavbar } from "@/components/shared/public-navbar";
import { PublicFooter } from "@/components/shared/public-footer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Mentions Légales | Élancé",
  description: "Mentions Légales de la plateforme Élancé",
};

export default function MentionsLegalesPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white selection:bg-corp-blue-500/20">
      <PublicNavbar />
      
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-32 md:py-40">
        <Link href="/" className="inline-flex items-center text-sm font-bold text-corp-blue-600 hover:text-corp-blue-700 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-8">Mentions Légales</h1>
        
        <div className="prose prose-slate prose-lg max-w-none text-slate-600">
          <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
          
          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">1. Éditeur du site</h2>
          <p>
            Le site Élancé est édité par la société <strong>ACYA Consulting</strong>.<br />
            Siège social : [Adresse de la société]<br />
            Numéro de SIRET : [Numéro SIRET]<br />
            Directeur de la publication : ACYA Consulting
          </p>
          
          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">2. Hébergement</h2>
          <p>
            Le site est hébergé par :<br />
            [Nom de l'hébergeur]<br />
            [Adresse de l'hébergeur]<br />
            [Téléphone de l'hébergeur]
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">3. Propriété Intellectuelle</h2>
          <p>
            L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">4. Protection des données</h2>
          <p>
            Conformément à la réglementation applicable en matière de données à caractère personnel, vous disposez d'un droit d'accès, de rectification, d'opposition, de limitation du traitement, d'effacement et de portabilité de vos données. Pour exercer ces droits, veuillez nous contacter via notre page <Link href="/contact" className="text-corp-blue-600 font-bold hover:underline">Contact</Link>.
          </p>
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}
