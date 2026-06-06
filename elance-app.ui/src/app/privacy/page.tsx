import { PublicNavbar } from "@/components/shared/public-navbar";
import { PublicFooter } from "@/components/shared/public-footer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Politique de Confidentialité | Élancé",
  description: "Politique de Confidentialité de la plateforme Élancé",
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white selection:bg-corp-blue-500/20">
      <PublicNavbar />
      
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-32 md:py-40">
        <Link href="/" className="inline-flex items-center text-sm font-bold text-corp-blue-600 hover:text-corp-blue-700 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-8">Politique de Confidentialité</h1>
        
        <div className="prose prose-slate prose-lg max-w-none text-slate-600">
          <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
          
          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">1. Collecte des informations</h2>
          <p>
            Nous recueillons des informations lorsque vous vous inscrivez sur notre site, lorsque vous vous connectez à votre compte, et lorsque vous utilisez notre ERP. Les informations recueillies incluent votre nom, votre adresse e-mail, numéro de téléphone, et les données relatives à votre entreprise nécessaires à la gestion de votre espace.
          </p>
          
          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">2. Utilisation des informations</h2>
          <p>
            Toutes les informations que nous recueillons auprès de vous peuvent être utilisées pour :
          </p>
          <ul>
            <li>Personnaliser votre expérience et répondre à vos besoins individuels</li>
            <li>Fournir le service ERP Élancé</li>
            <li>Améliorer notre plateforme client</li>
            <li>Vous contacter par e-mail concernant les mises à jour et la sécurité</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">3. Confidentialité des données</h2>
          <p>
            Nous sommes les seuls propriétaires des informations recueillies sur ce site. Vos informations personnelles ne seront pas vendues, échangées, transférées, ou données à une autre société pour n'importe quelle raison, sans votre consentement, en dehors de ce qui est nécessaire pour répondre à une demande et / ou une transaction.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">4. Divulgation à des tiers</h2>
          <p>
            Nous ne vendons, n'échangeons et ne transférons pas vos informations personnelles identifiables à des tiers. Cela ne comprend pas les tierce parties de confiance qui nous aident à exploiter notre site Web ou à mener nos affaires, tant que ces parties conviennent de garder ces informations confidentielles.
          </p>
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}
