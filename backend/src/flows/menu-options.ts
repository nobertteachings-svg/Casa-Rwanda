import type { Language, UserRole } from "../i18n/messages.js";
import type { MenuOption } from "../services/whatsapp.js";

export function roleMenuOptions(_lang: Language = "en"): MenuOption[] {
  return [
    { id: "1", title: "Landlord", description: "List my property" },
    { id: "2", title: "Tenant", description: "Find a home" },
    { id: "3", title: "Referral code", description: "Enter referrer's number" },
  ];
}

export function mainMenuOptions(role: UserRole, _lang: Language = "en"): MenuOption[] {
  if (role === "landlord") {
    return [
      { id: "1", title: "List property" },
      { id: "2", title: "My listings" },
      { id: "3", title: "More options" },
      { id: "4", title: "Help" },
    ];
  }

  return [
    { id: "1", title: "Search homes" },
    { id: "2", title: "Unlocked contacts" },
    { id: "3", title: "More options" },
    { id: "4", title: "Help" },
  ];
}

export function categoryMenuOptions(lang: Language): MenuOption[] {
  return lang === "fr"
    ? [
        { id: "1", title: "Résidentiel", description: "Logement" },
        { id: "2", title: "Commercial", description: "Boutique, bureau..." },
        { id: "3", title: "Les deux" },
      ]
    : [
        { id: "1", title: "Residential", description: "Housing" },
        { id: "2", title: "Commercial", description: "Shop, office..." },
        { id: "3", title: "Either" },
      ];
}

export function listingModeMenuOptions(lang: Language): MenuOption[] {
  return lang === "fr"
    ? [
        { id: "1", title: "Décrire (IA)" },
        { id: "2", title: "Questions étape" },
        { id: "3", title: "Retour menu" },
      ]
    : [
        { id: "1", title: "Describe (AI)" },
        { id: "2", title: "Step-by-step" },
        { id: "3", title: "Back to menu" },
      ];
}

export function propertyCategoryMenuOptions(lang: Language): MenuOption[] {
  return lang === "fr"
    ? [
        { id: "1", title: "Résidentiel", description: "Logement" },
        { id: "2", title: "Commercial", description: "Boutique, bureau..." },
      ]
    : [
        { id: "1", title: "Residential", description: "Housing" },
        { id: "2", title: "Commercial", description: "Shop, office..." },
      ];
}

export function tenantSubmenuOptions(lang: Language): MenuOption[] {
  return lang === "fr"
    ? [
        { id: "1", title: "Alerte recherche" },
        { id: "2", title: "Comparer liste" },
        { id: "3", title: "Mode diaspora" },
        { id: "4", title: "Badge vérifié" },
        { id: "5", title: "Parrainer ami" },
        { id: "6", title: "Carte des loyers" },
      ]
    : [
        { id: "1", title: "Search alert" },
        { id: "2", title: "Compare list" },
        { id: "3", title: "Diaspora mode" },
        { id: "4", title: "Verified badge" },
        { id: "5", title: "Refer friend" },
        { id: "6", title: "Rent heat map" },
      ];
}

export function landlordSubmenuOptions(_lang: Language = "en"): MenuOption[] {
  return [
    { id: "1", title: "Performance" },
    { id: "2", title: "Generate lease" },
    { id: "3", title: "Bulk manage" },
    { id: "4", title: "Refer friend" },
    { id: "5", title: "Market trends" },
    { id: "6", title: "Verify ID" },
  ];
}

export function verificationMethodOptions(_lang: Language = "en"): MenuOption[] {
  return [
    { id: "1", title: "Name document photo" },
    { id: "2", title: "Bank account" },
  ];
}

export function houseSelectOptions(
  houses: Array<{ house_id: string; type: string; rent: number }>
): MenuOption[] {
  return houses.map((h, i) => ({
    id: String(i + 1),
    title: `${h.house_id}`.slice(0, 24),
    description: `${h.type}, ${h.rent.toLocaleString()} RWF`.slice(0, 72),
  }));
}

export function houseActionOptions(lang: Language, withPayment: boolean): MenuOption[] {
  if (withPayment) {
    return lang === "fr"
      ? [
          { id: "paid", title: "J'ai payé" },
          { id: "save", title: "Sauvegarder" },
          { id: "flag", title: "Signaler" },
        ]
      : [
          { id: "paid", title: "I paid" },
          { id: "save", title: "Save" },
          { id: "flag", title: "Flag" },
        ];
  }
  return lang === "fr"
    ? [
        { id: "save", title: "Sauvegarder" },
        { id: "flag", title: "Signaler" },
        { id: "menu", title: "Retour menu" },
      ]
    : [
        { id: "save", title: "Save" },
        { id: "flag", title: "Flag" },
        { id: "menu", title: "Back to menu" },
      ];
}

export function menuButtonLabel(lang: Language): string {
  return lang === "fr" ? "Voir options" : "View options";
}

export function landlordListingPickerOptions(
  houses: Array<{ house_id: string; type: string; rent: number; status: string }>,
  lang: Language
): MenuOption[] {
  return houses.slice(0, 10).map((h) => {
    const status =
      h.status === "active"
        ? lang === "fr"
          ? "dispo"
          : "live"
        : lang === "fr"
          ? "loué"
          : "rented";
    return {
      id: h.house_id,
      title: h.house_id.slice(0, 24),
      description: `${h.type}, ${h.rent.toLocaleString()} RWF · ${status}`.slice(0, 72),
    };
  });
}

export function landlordListingActionOptions(lang: Language, status: string): MenuOption[] {
  if (status === "inactive") {
    return lang === "fr"
      ? [
          { id: "reactivate", title: "Remettre en ligne" },
          { id: "menu", title: "Retour liste" },
        ]
      : [
          { id: "reactivate", title: "Put back online" },
          { id: "menu", title: "Back to list" },
        ];
  }

  return lang === "fr"
    ? [
        { id: "rented", title: "Marquer comme loué" },
        { id: "menu", title: "Retour liste" },
      ]
    : [
        { id: "rented", title: "Mark as rented" },
        { id: "menu", title: "Back to list" },
      ];
}

export function flagReasonOptions(lang: Language): MenuOption[] {
  return lang === "fr"
    ? [
        { id: "rented", title: "Déjà loué" },
        { id: "other", title: "Autre problème" },
      ]
    : [
        { id: "rented", title: "Already rented" },
        { id: "other", title: "Other issue" },
      ];
}
