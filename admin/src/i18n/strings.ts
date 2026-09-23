export type Lang = "en" | "fr";

const strings = {
  en: {
    dashboard: "Dashboard",
    users: "Users",
    listings: "Listings",
    moderation: "Moderation",
    verifications: "Verifications",
    payments: "Payments",
    insights: "Insights",
    settings: "Settings",
    audit: "Audit log",
    signOut: "Sign out",
    search: "Search phone, house ID, area…",
    runAiAll: "Run AI on all pending",
    approve: "Approve",
    reject: "Reject",
    verify: "Verify landlord",
    suspend: "Suspend",
    unsuspend: "Unsuspend",
    export: "Export CSV",
    dark: "Dark",
    light: "Light",
    language: "FR",
  },
  fr: {
    dashboard: "Tableau de bord",
    users: "Utilisateurs",
    listings: "Annonces",
    moderation: "Modération",
    verifications: "Vérifications",
    payments: "Paiements",
    insights: "Analyses",
    settings: "Paramètres",
    audit: "Journal d'audit",
    signOut: "Déconnexion",
    search: "Rechercher téléphone, ID, quartier…",
    runAiAll: "Lancer l'IA sur tout",
    approve: "Approuver",
    reject: "Rejeter",
    verify: "Vérifier propriétaire",
    suspend: "Suspendre",
    unsuspend: "Réactiver",
    export: "Exporter CSV",
    dark: "Sombre",
    light: "Clair",
    language: "EN",
  },
} as const;

export function t(lang: Lang, key: keyof (typeof strings)["en"]): string {
  return strings[lang][key];
}
