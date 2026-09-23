export type Language = "en" | "fr";
export type UserRole = "landlord" | "tenant";

export interface Messages {
  welcome: string;
  chooseLanguage: string;
  languageSet: (lang: Language) => string;
  chooseRole: string;
  roleSet: (role: UserRole) => string;
  mainMenuLandlord: string;
  mainMenuTenant: string;
  invalidChoice: string;
  help: string;
  changeLanguage: string;
  registered: string;
}

export const en: Messages = {
  welcome:
    "🏠 *Welcome to Casa Rwanda!*\n\nFind your home on WhatsApp — no app download needed.\n\nRwanda's housing platform, powered by AI.",
  chooseLanguage: "Casa Rwanda uses English.",
  languageSet: (lang) =>
    lang === "en" ? "✅ Language set to English." : "✅ Langue définie sur Français.",
  chooseRole:
    "Are you a landlord or looking for a home?\n\n*1.* 🏡 I'm a landlord (list my property)\n*2.* 🔍 I'm a tenant (find a home)\n*3.* 🌍 I have a referral code (enter referrer's number)",
  roleSet: (role) =>
    role === "landlord"
      ? "✅ You're registered as a *landlord*."
      : "✅ You're registered as a *tenant*.",
  mainMenuLandlord:
    "🏡 *Landlord Menu*\n\n*1.* List a new property\n*2.* My listings\n*3.* More options (stats, ID verify, lease…)\n*4.* Help\n\n🪪 Send a document with your *name* to verify before listing\n🎥 Video walkthrough required for every listing\n💡 Send a *voice note* anytime instead of typing",
  mainMenuTenant:
    "🔍 *Tenant Menu*\n\n*1.* Search for a home\n*2.* My unlocked contacts\n*3.* More options (alerts, compare, diaspora…)\n*4.* Help\n\n💡 Send a *voice note* anytime instead of typing",
  invalidChoice: "Please tap an option above, or reply with a valid number.",
  help:
    "Casa Rwanda helps landlords list properties and tenants find homes — all on WhatsApp.\n\n*Tenant tips:* Search, save alerts, compare listings, diaspora mode, rent heat map.\n*Landlord tips:* AI listing, performance stats, bulk manage, generate leases.\n*Trust:* Verified badges, community flagging.\n*Growth:* Refer friends for free unlock credits.\n\nSupport: reply HELP anytime.",
  changeLanguage: "Casa Rwanda uses English across Rwanda.",
  registered: "Your Casa Rwanda account is ready. Here's what you can do:",
};

export const fr: Messages = {
  welcome:
    "🏠 *Bienvenue sur Casa Rwanda !*\n\nTrouvez votre logement sur WhatsApp — sans télécharger d'application.\n\nLa plateforme immobilière du Rwanda, propulsée par l'IA.",
  chooseLanguage:
    "Choisissez votre langue / Choose your language:\n\n*1.* English\n*2.* Français",
  languageSet: (lang) =>
    lang === "fr" ? "✅ Langue définie sur Français." : "✅ Language set to English.",
  chooseRole:
    "Êtes-vous propriétaire ou vous cherchez un logement ?\n\n*1.* 🏡 Je suis propriétaire\n*2.* 🔍 Je cherche un logement\n*3.* 🌍 J'ai un code de parrainage (numéro du parrain)",
  roleSet: (role) =>
    role === "landlord"
      ? "✅ Vous êtes enregistré comme *propriétaire*."
      : "✅ Vous êtes enregistré comme *locataire*.",
  mainMenuLandlord:
    "🏡 *Menu Propriétaire*\n\n*1.* Publier un bien\n*2.* Mes annonces\n*3.* Plus d'options (stats, vérif. ID, bail…)\n*4.* Aide\n\n🪪 Envoyez un document avec votre *nom* pour vérifier avant publication\n🎥 Vidéo de visite obligatoire pour chaque annonce\n💡 Envoyez une *note vocale* à tout moment",
  mainMenuTenant:
    "🔍 *Menu Locataire*\n\n*1.* Chercher un logement\n*2.* Mes contacts débloqués\n*3.* Plus d'options (alertes, comparer, diaspora…)\n*4.* Aide\n\n💡 Envoyez une *note vocale* à tout moment",
  invalidChoice: "Appuyez sur une option ci-dessus, ou répondez avec un numéro valide.",
  help:
    "Casa Rwanda aide propriétaires et locataires sur WhatsApp.\n\n*Locataires :* Recherche, alertes, comparaison, mode diaspora, carte des loyers.\n*Propriétaires :* Annonce IA, stats, gestion groupée, contrats de bail.\n*Confiance :* Badges vérifiés, signalements communautaires.\n*Croissance :* Parrainez des amis pour des crédits gratuits.\n\nSupport : répondez AIDE.",
  changeLanguage: "Casa Rwanda utilise l'anglais au Rwanda.",
  registered: "Votre compte Casa Rwanda est prêt. Voici ce que vous pouvez faire :",
};
