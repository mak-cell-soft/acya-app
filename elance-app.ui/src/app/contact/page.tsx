import type { Metadata } from "next";
import { ContactPageClient } from "./contact-client";

export const metadata: Metadata = {
  title: "Contact — Demandez une démo de l'ERP Élancé",
  description:
    "Contactez ACYA Consulting pour une démonstration personnalisée d'Élancé, l'ERP SaaS pour le bois, les chantiers et la production en Tunisie. Réponse sous 24h.",
  alternates: {
    canonical: "https://acya.site/contact",
  },
  openGraph: {
    title: "Contact — Demandez une démo de l'ERP Élancé",
    description:
      "Contactez ACYA Consulting pour une démo personnalisée d'Élancé. ERP SaaS pour le bois, les chantiers BTP et la production en Tunisie.",
    url: "https://acya.site/contact",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
