import type { Language } from "../api/client";

type Strings = {
  loginSubtitle: string;
  phoneLabel: string;
  phoneNote: string;
  loginFirstTimeHint: string;
  otpWhatsappFailed: string;
  sendCode: string;
  codeLabel: string;
  codeHint: (phone: string, mins: number) => string;
  codeHintClick: (mins: number) => string;
  continue: string;
  changeNumber: string;
  signupHint: string;
  openWhatsApp: string;
  openWhatsAppForCode: string;
  roleTenant: string;
  roleLandlord: string;
  logout: string;
  logoutConfirm: string;
  menu: string;
  shareLocation: string;
  shareLocationUser: string;
  messagePlaceholder: string;
  send: string;
  locationDenied: string;
  welcomeTenant: string;
  welcomeLandlord: string;
  welcomeSignup: string;
  tapMenu: string;
  errorGeneric: string;
  tabChat: string;
  tabBrowse: string;
  tabListings: string;
  tabAccount: string;
  tabContacts: string;
  tabMenu: string;
  searchTitle: string;
  searchModeMap: string;
  searchModeManual: string;
  searchNearMe: string;
  searchManualBtn: string;
  searchRegion: string;
  searchTown: string;
  searchNeighbourhood: string;
  searchMinRent: string;
  searchMaxRent: string;
  searchPriceHint: string;
  searchParking: string;
  searchWater: string;
  searchAnyRegion: string;
  searchResults: (n: number) => string;
  searchEmpty: string;
  searchEmptyHint: string;
  searchDistance: (km: number) => string;
  browseTitle: string;
  browseEmpty: string;
  browseRent: (amount: number) => string;
  browseUnlock: string;
  browseUnlockDone: string;
  browseLandlordOnly: string;
  takePhoto: string;
  takeVideo: string;
  uploadBusy: string;
  uploadDone: string;
  cameraDenied: string;
  signingUp: string;
  changeLanguage: string;
  themeTitle: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  openMap: string;
  mapTitle: string;
  mapDirections: string;
  mapCount: (n: number) => string;
  languageUpdated: string;
  detailTitle: string;
  detailClose: string;
  detailDirections: string;
  detailCall: string;
  detailWhatsApp: string;
  detailAmenities: string;
  detailDescription: string;
  detailInactive: string;
  detailMonthsUpfront: (n: number) => string;
  detailWater: string;
  detailParking: string;
  detailFenced: string;
  detailBorehole: string;
  detailFurnished: string;
  detailSecurity: string;
  detailGenerator: string;
  detailViewListing: string;
  landlordTitle: string;
  landlordSubtitle: string;
  landlordEmpty: string;
  landlordEmptyHint: string;
  landlordEdit: string;
  landlordEditTitle: string;
  landlordSave: string;
  landlordMarkRented: string;
  landlordReactivate: string;
  landlordRemove: string;
  landlordRemoveTitle: string;
  landlordRemoveConfirm: string;
  landlordStatusActive: string;
  landlordStatusRented: string;
  landlordRentLabel: string;
  landlordMonthsUpfront: string;
  landlordRentRequired: string;
  verifyBadgeVerified: string;
  verifyBadgeUnverified: string;
  verifyBannerTitle: string;
  verifyBannerBody: string;
  verifyBannerCta: string;
  signupTitle: string;
  signupSubtitle: string;
  signupTenantDesc: string;
  signupLandlordDesc: string;
  signupReferralToggle: string;
  signupReferralLabel: string;
  actionListProperty: string;
  actionMoreOptions: string;
  landlordActions: string;
  tenantActions: string;
  helpTitle: string;
  helpBody: string;
  deleteAccountTitle: string;
  deleteAccountBody: string;
  deleteAccountLink: string;
  contactsSubtitle: string;
  contactsEmpty: string;
  contactsEmptyHint: string;
  flowWorking: string;
  flowYes: string;
  flowNo: string;
  flowConfirm: string;
  flowPickRent: string;
  flowPickBedrooms: string;
  flowPickToilets: string;
  flowBedroomsHint: string;
  flowPhotosAdded: (n: number) => string;
  flowPhotosDone: string;
  flowVideoDone: string;
  flowLocationTooShort: string;
  flowSuggestions: string;
  tabSaved: string;
  offlineBanner: string;
  pullRefresh: string;
  searchCategory: string;
  searchResidential: string;
  searchCommercial: string;
  searchFenced: string;
  searchGenerator: string;
  searchSort: string;
  sortNewest: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortDistance: string;
  saveSearch: string;
  saveSearchDone: string;
  savedTitle: string;
  savedShortlist: string;
  savedAlerts: string;
  savedCompare: string;
  savedCompareNeed: string;
  savedEmptyShortlist: string;
  savedEmptyShortlistHint: string;
  savedEmptyAlerts: string;
  savedEmptyAlertsHint: string;
  savedRemove: string;
  savedAddAlert: string;
  detailSave: string;
  detailSaved: string;
  detailReport: string;
  detailReportTitle: string;
  detailReportPlaceholder: string;
  detailReportSubmit: string;
  detailListedAgo: (days: number) => string;
  trustVerifiedPlus: string;
  unlockSheetTitle: string;
  unlockFee: (rwf: number) => string;
  unlockReference: (ref: string) => string;
  unlockCredits: (n: number) => string;
  unlockDailyLimit: (used: number, limit: number) => string;
  unlockCopyReference: string;
  unlockCopied: string;
  unlockOpenMomo: string;
  unlockConfirmPaid: string;
  unlockFreeForNow: string;
  unlockAlreadyDone: string;
  unlockLimitReached: string;
  unlockPaymentRequired: string;
  unlockMoveInTitle: string;
  unlockMoveInTotal: (rwf: number) => string;
  marketTitle: string;
  marketHeatMap: string;
  diasporaTitle: string;
  diasporaHint: string;
  diasporaSave: string;
  referTitle: string;
  referShare: string;
  tenantVerifyTitle: string;
  tenantVerifyId: string;
  tenantVerifyMomo: string;
  pickFromGallery: string;
  flowPublish: string;
  flowCancelPublish: string;
  landlordStatsTitle: string;
  landlordBulkActivate: string;
  landlordBulkDeactivate: string;
  detailBedrooms: (n: number) => string;
  detailToilets: (n: number) => string;
  detailElectricity: (meter: string) => string;
  detailShare: string;
  detailRetry: string;
  detailGallery: string;
  detailConcierge: string;
  detailLease: string;
  detailReportRented: string;
  searchFurnished: string;
  searchSecurity: string;
  searchElectricity: string;
  searchPropertyType: string;
  searchMinBeds: string;
  searchMinToilets: string;
  searchSubtypeStudio: string;
  searchSubtypeApartment: string;
  searchSubtypeHouse: string;
  searchAnyType: string;
  savedAiCompare: string;
  marketTrendsTitle: string;
  marketTrendLine: (area: string, pct: number) => string;
  tenantVerifiedBadge: string;
  tenantVerifyPrompt: string;
  onboardingSkip: string;
  onboardingNext: string;
  onboardingDone: string;
  onboardingTenant1Title: string;
  onboardingTenant1Body: string;
  onboardingTenant2Title: string;
  onboardingTenant2Body: string;
  onboardingTenant3Title: string;
  onboardingTenant3Body: string;
  onboardingLandlord1Title: string;
  onboardingLandlord1Body: string;
  onboardingLandlord2Title: string;
  onboardingLandlord2Body: string;
  onboardingLandlord3Title: string;
  onboardingLandlord3Body: string;
  lowDataMode: string;
  lowDataHint: string;
  notificationInbox: string;
  notificationEmpty: string;
  landlordGenerateLease: string;
  landlordAddPhotos: string;
  landlordAddVideo: string;
  landlordViewsUnlocks: (views: number, unlocks: number) => string;
  cachedResultsHint: string;
  errorRetry: string;
  goToSearch: string;
  savedRemoveItem: string;
  savedCompareResult: string;
  savedAiCompareTitle: string;
  savedAiBestFit: string;
  searchTownPlaceholder: string;
  searchNeighbourhoodPlaceholder: string;
  searchValidationLocation: string;
  searchValidationRent: string;
  detailReportThanks: string;
  detailReportRentedThanks: string;
  unlockSuccessHint: string;
  unlockStepContact: string;
  searching: string;
  searchPlaceholder: string;
  filters: string;
  filtersApply: string;
  filtersClear: string;
  filtersCount: (n: number) => string;
  mapView: string;
  listView: string;
  searchMeterPrepaid: string;
  searchMeterPostpaid: string;
  cardBeds: (n: number) => string;
  cardBaths: (n: number) => string;
  cardMonths: (n: number) => string;
  unlockWhy: string;
  unlockStepCopyLabel: string;
  unlockStepPayLabel: string;
  unlockStepConfirmLabel: string;
  unlockMessageWhatsApp: string;
  unlockShowNumber: string;
  listStepWhat: string;
  listStepWhere: string;
  listStepHome: string;
  listStepPhotos: string;
  listStepOf: (n: number, total: number) => string;
  listPhotosHint: string;
  listAmenitiesNext: string;
  moreActions: string;
  bulkConfirmActivate: string;
  bulkConfirmDeactivate: string;
  signupRoleHint: string;
  loginCodeFailedHint: string;
  coachFilters: string;
  coachListPhotos: string;
  yourLandlords: string;
  accountYou: string;
  accountActivity: string;
  accountTools: string;
  accountSettings: string;
  locationAsk: string;
  savedTitleShort: string;
  loginContinueBrowse: string;
  loginToContinue: string;
  guestAccountHint: string;
  filtersMore: string;
  filtersLess: string;
  listVideoRequired: string;
  accountMoreTools: string;
  menuBulkManage: string;
  menuAgent: string;
  menuOpenFull: string;
  menuVerifyRequested: string;
  accountLogin: string;
  signupConfirm: string;
  signupConfirmTenant: string;
  signupConfirmLandlord: string;
  tabInterest: string;
  interestEmpty: string;
  interestEmptyHint: string;
  compareColRent: string;
  compareColArea: string;
  compareColBeds: string;
  locationTypeHint: string;
  unlockComingSoon: string;
  notificationEmptyLine: string;
};

const en: Strings = {
  loginSubtitle: "Find your home — on the app or WhatsApp.",
  phoneLabel: "Your WhatsApp number",
  phoneNote:
    "Already on Casa? Continue with your WhatsApp number. New here? We'll send a code on WhatsApp.",
  loginFirstTimeHint: "We'll send a 6-digit code on WhatsApp.",
  otpWhatsappFailed:
    "Could not send the WhatsApp code. Check the number and try again in a moment.",
  sendCode: "Continue",
  codeLabel: "Enter the 6-digit code",
  codeHint: (phone, mins) =>
    `We sent a code to WhatsApp (${phone}). It expires in ${mins} minutes.`,
  codeHintClick: (mins) =>
    `WhatsApp will open. Tap Send — Casa replies with your 6-digit code. It expires in ${mins} minutes.`,
  continue: "Continue",
  changeNumber: "Change number",
  signupHint: "Prefer WhatsApp?",
  openWhatsApp: "Open Casa on WhatsApp instead",
  openWhatsAppForCode: "Open WhatsApp to get the code",
  roleTenant: "Tenant",
  roleLandlord: "Landlord",
  logout: "Log out",
  logoutConfirm: "Log out of this Casa account?",
  menu: "Main menu",
  shareLocation: "Share location",
  shareLocationUser: "📍 My location",
  messagePlaceholder: "Type a message…",
  send: "Send",
  locationDenied: "Allow location so Casa can find homes near you.",
  welcomeTenant: "Welcome! Tap a button below or share 📍 to search nearby.",
  welcomeLandlord: "Welcome! Tap a button below to list or manage your properties.",
  welcomeSignup:
    "Welcome! Choose tenant or landlord — same steps as WhatsApp.",
  tapMenu: "Tip: tap Main menu anytime to go back.",
  errorGeneric: "Something went wrong. Try again.",
  tabChat: "Chat",
  tabBrowse: "Search",
  tabListings: "My listings",
  tabAccount: "Account",
  tabContacts: "Contacts",
  tabMenu: "Menu",
  searchTitle: "Find a home",
  searchModeMap: "Near me",
  searchModeManual: "Manual filters",
  searchNearMe: "Search near my location",
  searchManualBtn: "Search",
  searchRegion: "Region",
  searchTown: "Town / city",
  searchNeighbourhood: "Neighbourhood",
  searchMinRent: "Min rent (RWF)",
  searchMaxRent: "Max rent (RWF)",
  searchPriceHint: "Leave blank for no limit",
  searchParking: "Parking",
  searchWater: "Water supply",
  searchAnyRegion: "Any region",
  searchResults: (n) => `${n} home(s) found`,
  searchEmpty: "No homes match your search.",
  searchEmptyHint: "Try widening your filters or search near your current location.",
  searchDistance: (km) => `${km.toFixed(1)} km away`,
  browseTitle: "Available homes",
  browseEmpty: "No listings yet. Check back soon.",
  browseRent: (amount) => `${amount.toLocaleString()} RWF / month`,
  browseUnlock: "Get landlord contact",
  browseUnlockDone: "Contact unlocked — see Contacts tab",
  browseLandlordOnly: "Switch to tenant account to unlock contacts.",
  takePhoto: "Take photo",
  takeVideo: "Record video",
  uploadBusy: "Uploading…",
  uploadDone: "Uploaded ✓",
  cameraDenied: "Allow camera access to add photos or videos.",
  signingUp: "Creating your account…",
  changeLanguage: "Language",
  themeTitle: "Appearance",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "System",
  openMap: "Open map",
  mapTitle: "Homes nearby",
  mapDirections: "Directions",
  mapCount: (n) => (n === 1 ? "1 home" : `${n} homes`),
  languageUpdated: "Language updated",
  detailTitle: "Listing details",
  detailClose: "Close",
  detailDirections: "Directions",
  detailCall: "Call",
  detailWhatsApp: "WhatsApp",
  detailAmenities: "Amenities",
  detailDescription: "Description",
  detailInactive: "Not available",
  detailMonthsUpfront: (n) => `${n} month(s) upfront`,
  detailWater: "Water supply",
  detailParking: "Parking",
  detailFenced: "Gated / fenced",
  detailBorehole: "Borehole / tank",
  detailFurnished: "Furnished",
  detailSecurity: "Security / askari",
  detailGenerator: "Backup power",
  detailViewListing: "View details",
  landlordTitle: "My listings",
  landlordSubtitle: "Edit, mark as rented, or remove from search.",
  landlordEmpty: "No listings yet.",
  landlordEmptyHint: "Add your first property with photos and a walkthrough video.",
  landlordEdit: "Edit",
  landlordEditTitle: "Edit listing",
  landlordSave: "Save",
  landlordMarkRented: "Mark rented",
  landlordReactivate: "Reactivate",
  landlordRemove: "Remove",
  landlordRemoveTitle: "Remove listing?",
  landlordRemoveConfirm: "This hides the listing from search. You can reactivate later from Chat.",
  landlordStatusActive: "Active",
  landlordStatusRented: "Rented / hidden",
  landlordRentLabel: "Monthly rent (RWF)",
  landlordMonthsUpfront: "Months upfront",
  landlordRentRequired: "Enter a valid rent amount.",
  verifyBadgeVerified: "Verified landlord",
  verifyBadgeUnverified: "Not verified",
  verifyBannerTitle: "Get your verified badge",
  verifyBannerBody:
    "Tenants trust verified landlords. Send one photo of an ID document (or any document with your name) in Chat.",
  verifyBannerCta: "Verify now",
  signupTitle: "Join Casa",
  signupSubtitle: "How will you use Casa?",
  signupTenantDesc: "Search homes and message landlords on WhatsApp.",
  signupLandlordDesc: "List homes and see who is interested.",
  signupReferralToggle: "Have a referral number?",
  signupReferralLabel: "Referrer's WhatsApp number",
  actionListProperty: "List a property",
  actionMoreOptions: "More options",
  landlordActions: "Landlord actions",
  tenantActions: "Tenant actions",
  helpTitle: "Help",
  helpBody: "Search uses the map or manual filters. Unlock a listing to call or WhatsApp the landlord. Landlords: verify ID once, then list with photos and a walkthrough video.",
  deleteAccountTitle: "Delete account",
  deleteAccountBody: "To delete your Casa account and personal data, follow the steps on our account deletion page.",
  deleteAccountLink: "Request account deletion",
  contactsSubtitle: "Landlords you unlocked — tap to call or chat.",
  contactsEmpty: "No unlocked contacts yet.",
  contactsEmptyHint: "Search for a home and unlock the landlord to call or WhatsApp them.",
  flowWorking: "Loading…",
  flowYes: "Yes",
  flowNo: "No",
  flowConfirm: "Confirm",
  flowPickRent: "Pick monthly rent",
  flowPickBedrooms: "How many bedrooms?",
  flowPickToilets: "How many toilets / bathrooms?",
  flowBedroomsHint: "Include sitting room / living room",
  flowPhotosAdded: (n) => `${n} photo(s) added`,
  flowPhotosDone: "Done with photos",
  flowVideoDone: "Done with video",
  flowLocationTooShort: "Enter at least 2 characters.",
  flowSuggestions: "Suggestions — tap to fill, or type your own",
  tabSaved: "Saved",
  offlineBanner: "You're offline — check your connection and pull to refresh.",
  pullRefresh: "Pull to refresh",
  searchCategory: "Property type",
  searchResidential: "Residential",
  searchCommercial: "Commercial",
  searchFenced: "Gated / fenced",
  searchGenerator: "Backup power",
  searchSort: "Sort by",
  sortNewest: "Newest",
  sortPriceAsc: "Price ↑",
  sortPriceDesc: "Price ↓",
  sortDistance: "Distance",
  saveSearch: "Save search & get alerts",
  saveSearchDone: "Alert saved — we'll notify you when a match appears.",
  savedTitle: "Saved & alerts",
  savedShortlist: "Compare shortlist",
  savedAlerts: "Search alerts",
  savedCompare: "Compare listings",
  savedCompareNeed: "Save at least 2 listings from details to compare.",
  savedEmptyShortlist: "Nothing saved yet.",
  savedEmptyShortlistHint: "Tap Save on any listing while browsing to build your shortlist.",
  savedEmptyAlerts: "No search alerts yet.",
  savedEmptyAlertsHint: "Save a search from the Search tab to get notified when new homes match.",
  savedRemove: "Remove",
  savedAddAlert: "New alert from last search",
  detailSave: "Save to compare",
  detailSaved: "Saved ✓",
  detailReport: "Report listing",
  detailReportTitle: "Why are you reporting?",
  detailReportPlaceholder: "e.g. Already rented, scam, wrong price…",
  detailReportSubmit: "Submit report",
  detailListedAgo: (days) => (days === 0 ? "Listed today" : `Listed ${days} day(s) ago`),
  trustVerifiedPlus: "Verified+",
  unlockSheetTitle: "Unlock landlord contact",
  unlockFee: (rwf) => `${rwf.toLocaleString()} RWF unlock fee`,
  unlockReference: (ref) => `Payment reference: ${ref}`,
  unlockCredits: (n) => `${n} free unlock credit(s) available`,
  unlockDailyLimit: (used, limit) => `Daily unlocks: ${used}/${limit}`,
  unlockCopyReference: "Copy reference",
  unlockCopied: "Copied ✓",
  unlockOpenMomo: "Open Mobile Money",
  unlockConfirmPaid: "I've paid",
  unlockFreeForNow: "Unlock is free for now — tap below to get the contact.",
  unlockAlreadyDone: "You already unlocked this listing.",
  unlockLimitReached: "Daily unlock limit reached. Try again tomorrow.",
  unlockPaymentRequired: "Complete payment, then tap I've paid.",
  unlockMoveInTitle: "Estimated move-in cost",
  unlockMoveInTotal: (rwf) => `Total: ${rwf.toLocaleString()} RWF`,
  marketTitle: "Rent heat map",
  marketHeatMap: "Average rent by area (active listings)",
  diasporaTitle: "Diaspora mode",
  diasporaHint: "Family member's WhatsApp in Rwanda receives unlock contacts.",
  diasporaSave: "Save beneficiary",
  referTitle: "Refer a friend",
  referShare: "Share invite",
  tenantVerifyTitle: "Tenant verification",
  tenantVerifyId: "Verify with ID",
  tenantVerifyMomo: "Verify with Mobile Money",
  pickFromGallery: "Choose from gallery",
  flowPublish: "Publish listing",
  flowCancelPublish: "Cancel",
  landlordStatsTitle: "Performance (7 days)",
  landlordBulkActivate: "Activate all",
  landlordBulkDeactivate: "Deactivate all",
  detailBedrooms: (n) => `${n} bedroom(s)`,
  detailToilets: (n) => `${n} toilet(s)`,
  detailElectricity: (meter) => `Electricity: ${meter}`,
  detailShare: "Share listing",
  detailRetry: "Retry",
  detailGallery: "Full gallery",
  detailConcierge: "Move-in guide",
  detailLease: "Lease template",
  detailReportRented: "Already rented?",
  searchFurnished: "Furnished",
  searchSecurity: "Security",
  searchElectricity: "Meter",
  searchPropertyType: "Property type",
  searchMinBeds: "Min beds",
  searchMinToilets: "Min toilets",
  searchSubtypeStudio: "Studio / bedsitter",
  searchSubtypeApartment: "1–3 bedroom",
  searchSubtypeHouse: "Maisonette / bungalow",
  searchAnyType: "Any type",
  savedAiCompare: "AI compare",
  marketTrendsTitle: "Rent trends",
  marketTrendLine: (area, pct) => `${area}: ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`,
  tenantVerifiedBadge: "Verified tenant",
  tenantVerifyPrompt: "Verify tenant profile",
  onboardingSkip: "Skip",
  onboardingNext: "Next",
  onboardingDone: "Get started",
  onboardingTenant1Title: "Search on the map",
  onboardingTenant1Body: "Find verified homes near you or filter by town, rent, and amenities.",
  onboardingTenant2Title: "Unlock landlord contact",
  onboardingTenant2Body: "Pay a small fee (when enabled) to call or WhatsApp the landlord directly.",
  onboardingTenant3Title: "Save & compare",
  onboardingTenant3Body: "Shortlist favourites, get alerts, and compare listings side by side.",
  onboardingLandlord1Title: "Verify your ID",
  onboardingLandlord1Body: "Verified landlords get more unlocks. One photo of your ID is enough.",
  onboardingLandlord2Title: "List with video",
  onboardingLandlord2Body: "Every listing needs a walkthrough video — tenants trust what they see.",
  onboardingLandlord3Title: "Track performance",
  onboardingLandlord3Body: "See views and unlocks, edit rent, and mark homes as rented in one tap.",
  lowDataMode: "Low-data mode",
  lowDataHint: "Thumbnails only — tap to load full photos and video on Wi‑Fi.",
  notificationInbox: "Notifications",
  notificationEmpty: "No notifications yet.",
  landlordGenerateLease: "Generate lease",
  landlordAddPhotos: "Add photos",
  landlordAddVideo: "Add video",
  landlordViewsUnlocks: (views, unlocks) => `${views} views · ${unlocks} unlocks`,
  cachedResultsHint: "Showing saved results — pull to refresh when online.",
  errorRetry: "Retry",
  goToSearch: "Start searching",
  savedRemoveItem: "Remove from shortlist",
  savedCompareResult: "Compare result",
  savedAiCompareTitle: "AI compare",
  savedAiBestFit: "Best fit",
  searchTownPlaceholder: "Kigali…",
  searchNeighbourhoodPlaceholder: "Kimironko, Remera, Kacyiru…",
  searchValidationLocation: "Enter region, town, or neighbourhood.",
  searchValidationRent: "Min rent must be less than max rent.",
  detailReportThanks: "Thanks — our team will review.",
  detailReportRentedThanks: "Thanks — listing hidden.",
  unlockSuccessHint: "You can message the landlord now.",
  unlockStepContact: "Show WhatsApp number",
  searching: "Finding homes near you…",
  searchPlaceholder: "Kimironko, Remera, Kacyiru…",
  filters: "Filters",
  filtersApply: "Show homes",
  filtersClear: "Clear",
  filtersCount: (n) => (n === 0 ? "Filters" : `${n} filters`),
  mapView: "Map",
  listView: "List",
  searchMeterPrepaid: "Token meter",
  searchMeterPostpaid: "Postpaid bill",
  cardBeds: (n) => `${n} bed`,
  cardBaths: (n) => `${n} bath`,
  cardMonths: (n) => `${n} mo up front`,
  unlockWhy: "Pay this fee to get the landlord’s WhatsApp. Casa does not take a commission on rent.",
  unlockStepCopyLabel: "1. Copy code",
  unlockStepPayLabel: "2. Pay with Mobile Money",
  unlockStepConfirmLabel: "3. I’ve paid",
  unlockMessageWhatsApp: "Message on WhatsApp",
  unlockShowNumber: "Show WhatsApp number",
  listStepWhat: "What",
  listStepWhere: "Where",
  listStepHome: "The home",
  listStepPhotos: "Photos",
  listStepOf: (n, total) => `${n} of ${total}`,
  listPhotosHint: "Add at least 5 photos — tenants skip empty listings.",
  listAmenitiesNext: "Continue",
  moreActions: "More",
  bulkConfirmActivate: "Turn all listings on?",
  bulkConfirmDeactivate: "Turn all listings off?",
  signupRoleHint: "You can message Casa on WhatsApp if you pick the wrong role.",
  loginCodeFailedHint:
    "Code didn’t arrive? Open WhatsApp, tap Send, then enter the code Casa replies with.",
  coachFilters: "Tap Filters to set rent, beds, and neighbourhood.",
  coachListPhotos: "Add at least 4 photos. Tenants skip empty listings.",
  yourLandlords: "Your landlords",
  accountYou: "You",
  accountActivity: "Activity",
  accountTools: "Tools",
  accountSettings: "Settings",
  locationAsk: "Show homes near you",
  savedTitleShort: "Saved",
  loginContinueBrowse: "Not now — keep browsing",
  loginToContinue: "Log in to save homes and get the landlord’s number.",
  guestAccountHint: "Browse freely. Log in when you want to save or get a contact.",
  filtersMore: "More filters",
  filtersLess: "Fewer filters",
  listVideoRequired: "A walkthrough video is required before you can publish.",
  accountMoreTools: "More tools",
  menuBulkManage: "Bulk manage",
  menuAgent: "Agent mode",
  menuOpenFull: "Open full WhatsApp menu",
  menuVerifyRequested: "Request received. Our team will review your ID or Mobile Money.",
  accountLogin: "Log in",
  signupConfirm: "Confirm",
  signupConfirmTenant: "I’m looking for a home",
  signupConfirmLandlord: "I list homes to rent",
  tabInterest: "Interest",
  interestEmpty: "No one has asked for a number yet",
  interestEmptyHint: "When a tenant taps Get contact, they show up here.",
  compareColRent: "Rent",
  compareColArea: "Area",
  compareColBeds: "Beds",
  locationTypeHint: "Type a neighbourhood above to search — Kimironko, Remera, Kacyiru, Musanze…",
  unlockComingSoon: "Contact unlock stays free for now. Try again in a moment.",
  notificationEmptyLine: "No notifications yet.",
};

const fr: Strings = {
  loginSubtitle: "Trouvez votre logement — sur l'app ou WhatsApp.",
  phoneLabel: "Votre numéro WhatsApp",
  phoneNote:
    "Déjà sur Casa ? Continuez avec votre numéro WhatsApp. Nouveau ? Nous enverrons un code sur WhatsApp.",
  loginFirstTimeHint: "Nous enverrons un code à 6 chiffres sur WhatsApp.",
  otpWhatsappFailed:
    "Impossible d'envoyer le code WhatsApp. Vérifiez le numéro et réessayez dans un instant.",
  sendCode: "Continuer",
  codeLabel: "Entrez le code à 6 chiffres",
  codeHint: (phone, mins) =>
    `Code envoyé sur WhatsApp (${phone}). Valide ${mins} minutes.`,
  codeHintClick: (mins) =>
    `WhatsApp va s'ouvrir. Appuyez sur Envoyer — Casa répond avec votre code à 6 chiffres. Valide ${mins} minutes.`,
  continue: "Continuer",
  changeNumber: "Changer de numéro",
  signupHint: "Vous préférez WhatsApp ?",
  openWhatsApp: "Ouvrir Casa sur WhatsApp",
  openWhatsAppForCode: "Ouvrir WhatsApp pour recevoir le code",
  roleTenant: "Locataire",
  roleLandlord: "Propriétaire",
  logout: "Déconnexion",
  logoutConfirm: "Se déconnecter de ce compte Casa ?",
  menu: "Menu principal",
  shareLocation: "Partager ma position",
  shareLocationUser: "📍 Ma position",
  messagePlaceholder: "Écrire un message…",
  send: "Envoyer",
  locationDenied: "Autorisez la localisation pour trouver des logements près de vous.",
  welcomeTenant:
    "Bienvenue ! Appuyez sur un bouton ci-dessous ou partagez 📍 pour chercher près de vous.",
  welcomeLandlord:
    "Bienvenue ! Appuyez sur un bouton ci-dessous pour publier ou gérer vos biens.",
  welcomeSignup:
    "Bienvenue ! Choisissez la langue, puis locataire ou propriétaire — comme sur WhatsApp.",
  tapMenu: "Astuce : appuyez sur Menu principal pour revenir en arrière.",
  errorGeneric: "Une erreur s'est produite. Réessayez.",
  tabChat: "Chat",
  tabBrowse: "Recherche",
  tabListings: "Mes annonces",
  tabAccount: "Compte",
  tabContacts: "Contacts",
  tabMenu: "Menu",
  searchTitle: "Trouver un logement",
  searchModeMap: "Près de moi",
  searchModeManual: "Filtres manuels",
  searchNearMe: "Chercher près de ma position",
  searchManualBtn: "Rechercher",
  searchRegion: "Région",
  searchTown: "Ville",
  searchNeighbourhood: "Quartier",
  searchMinRent: "Loyer min (RWF)",
  searchMaxRent: "Loyer max (RWF)",
  searchPriceHint: "Laisser vide = pas de limite",
  searchParking: "Parking",
  searchWater: "Eau fiable",
  searchAnyRegion: "Toute région",
  searchResults: (n) => `${n} logement(s) trouvé(s)`,
  searchEmpty: "Aucun logement ne correspond.",
  searchEmptyHint: "Élargissez vos filtres ou cherchez près de votre position.",
  searchDistance: (km) => `À ${km.toFixed(1)} km`,
  browseTitle: "Logements disponibles",
  browseEmpty: "Aucune annonce pour le moment.",
  browseRent: (amount) => `${amount.toLocaleString()} RWF / mois`,
  browseUnlock: "Obtenir le contact",
  browseUnlockDone: "Contact débloqué — voir l'onglet Contacts",
  browseLandlordOnly: "Compte locataire requis pour débloquer un contact.",
  takePhoto: "Prendre une photo",
  takeVideo: "Enregistrer une vidéo",
  uploadBusy: "Envoi en cours…",
  uploadDone: "Envoyé ✓",
  cameraDenied: "Autorisez l'appareil photo pour ajouter des médias.",
  signingUp: "Création du compte…",
  changeLanguage: "Langue",
  themeTitle: "Apparence",
  themeLight: "Clair",
  themeDark: "Sombre",
  themeSystem: "Système",
  openMap: "Ouvrir la carte",
  mapTitle: "Logements à proximité",
  mapDirections: "Itinéraire",
  mapCount: (n) => (n === 1 ? "1 logement" : `${n} logements`),
  languageUpdated: "Langue mise à jour",
  detailTitle: "Détails du logement",
  detailClose: "Fermer",
  detailDirections: "Itinéraire",
  detailCall: "Appeler",
  detailWhatsApp: "WhatsApp",
  detailAmenities: "Équipements",
  detailDescription: "Description",
  detailInactive: "Non disponible",
  detailMonthsUpfront: (n) => `${n} mois d'avance`,
  detailWater: "Eau fiable",
  detailParking: "Parking",
  detailFenced: "Clôturé / sécurisé",
  detailBorehole: "Forage / réservoir",
  detailFurnished: "Meublé",
  detailSecurity: "Sécurité / askari",
  detailGenerator: "Alim. de secours",
  detailViewListing: "Voir les détails",
  landlordTitle: "Mes annonces",
  landlordSubtitle: "Modifier, marquer loué ou retirer de la recherche.",
  landlordEmpty: "Aucune annonce pour l'instant.",
  landlordEmptyHint: "Ajoutez votre premier bien avec photos et vidéo de visite.",
  landlordEdit: "Modifier",
  landlordEditTitle: "Modifier l'annonce",
  landlordSave: "Enregistrer",
  landlordMarkRented: "Marquer loué",
  landlordReactivate: "Réactiver",
  landlordRemove: "Retirer",
  landlordRemoveTitle: "Retirer l'annonce ?",
  landlordRemoveConfirm:
    "L'annonce disparaît de la recherche. Vous pourrez la réactiver via le Chat.",
  landlordStatusActive: "Active",
  landlordStatusRented: "Loué / masquée",
  landlordRentLabel: "Loyer mensuel (RWF)",
  landlordMonthsUpfront: "Mois d'avance",
  landlordRentRequired: "Indiquez un loyer valide.",
  verifyBadgeVerified: "Propriétaire vérifié",
  verifyBadgeUnverified: "Non vérifié",
  verifyBannerTitle: "Obtenez votre badge vérifié",
  verifyBannerBody:
    "Les locataires font confiance aux propriétaires vérifiés. Envoyez une photo d'un document avec votre nom dans le Chat.",
  verifyBannerCta: "Vérifier maintenant",
  signupTitle: "Rejoindre Casa",
  signupSubtitle: "Comment allez-vous utiliser Casa ?",
  signupTenantDesc: "Chercher un logement et écrire au propriétaire sur WhatsApp.",
  signupLandlordDesc: "Publier vos biens et voir qui est intéressé.",
  signupReferralToggle: "Vous avez un numéro de parrain ?",
  signupReferralLabel: "Numéro WhatsApp du parrain",
  actionListProperty: "Publier un bien",
  actionMoreOptions: "Plus d'options",
  landlordActions: "Actions propriétaire",
  tenantActions: "Actions locataire",
  helpTitle: "Aide",
  helpBody:
    "Recherchez sur la carte ou avec les filtres. Débloquez une annonce pour appeler le propriétaire. Propriétaires : vérifiez votre identité, puis publiez avec photos et vidéo.",
  deleteAccountTitle: "Supprimer le compte",
  deleteAccountBody:
    "Pour supprimer votre compte Casa et vos données personnelles, suivez les étapes sur notre page de suppression de compte.",
  deleteAccountLink: "Demander la suppression du compte",
  contactsSubtitle: "Propriétaires débloqués — appuyez pour appeler ou écrire.",
  contactsEmpty: "Aucun contact débloqué.",
  contactsEmptyHint: "Cherchez un logement et débloquez le propriétaire pour l'appeler ou WhatsApp.",
  flowWorking: "Chargement…",
  flowYes: "Oui",
  flowNo: "Non",
  flowConfirm: "Confirmer",
  flowPickRent: "Choisissez le loyer mensuel",
  flowPickBedrooms: "Combien de chambres ?",
  flowPickToilets: "Combien de toilettes / salles de bain ?",
  flowBedroomsHint: "Incluez le salon / sitting room",
  flowPhotosAdded: (n) => `${n} photo(s) ajoutée(s)`,
  flowPhotosDone: "Photos terminées",
  flowVideoDone: "Vidéo terminée",
  flowLocationTooShort: "Entrez au moins 2 caractères.",
  flowSuggestions: "Suggestions — touchez pour remplir, ou saisissez le vôtre",
  tabSaved: "Enregistrés",
  offlineBanner: "Hors ligne — vérifiez votre connexion et tirez pour actualiser.",
  pullRefresh: "Tirer pour actualiser",
  searchCategory: "Type de bien",
  searchResidential: "Résidentiel",
  searchCommercial: "Commercial",
  searchFenced: "Clôturé / sécurisé",
  searchGenerator: "Alim. de secours",
  searchSort: "Trier par",
  sortNewest: "Plus récent",
  sortPriceAsc: "Prix ↑",
  sortPriceDesc: "Prix ↓",
  sortDistance: "Distance",
  saveSearch: "Enregistrer la recherche",
  saveSearchDone: "Alerte enregistrée — notification si correspondance.",
  savedTitle: "Enregistrés & alertes",
  savedShortlist: "Liste de comparaison",
  savedAlerts: "Alertes recherche",
  savedCompare: "Comparer",
  savedCompareNeed: "Enregistrez au moins 2 annonces depuis les détails.",
  savedEmptyShortlist: "Rien enregistré pour l'instant.",
  savedEmptyShortlistHint: "Touchez Enregistrer sur une annonce pour créer votre liste.",
  savedEmptyAlerts: "Aucune alerte pour l'instant.",
  savedEmptyAlertsHint: "Enregistrez une recherche depuis l'onglet Recherche pour être notifié.",
  savedRemove: "Retirer",
  savedAddAlert: "Alerte depuis dernière recherche",
  detailSave: "Enregistrer",
  detailSaved: "Enregistré ✓",
  detailReport: "Signaler",
  detailReportTitle: "Motif du signalement ?",
  detailReportPlaceholder: "ex. Déjà loué, arnaque…",
  detailReportSubmit: "Envoyer",
  detailListedAgo: (days) => (days === 0 ? "Publié aujourd'hui" : `Publié il y a ${days} jour(s)`),
  trustVerifiedPlus: "Vérifié+",
  unlockSheetTitle: "Débloquer le contact",
  unlockFee: (rwf) => `Frais : ${rwf.toLocaleString()} RWF`,
  unlockReference: (ref) => `Référence : ${ref}`,
  unlockCredits: (n) => `${n} crédit(s) gratuit(s)`,
  unlockDailyLimit: (used, limit) => `Déblocages du jour : ${used}/${limit}`,
  unlockCopyReference: "Copier la référence",
  unlockCopied: "Copié ✓",
  unlockOpenMomo: "Ouvrir Mobile Money",
  unlockConfirmPaid: "J'ai payé",
  unlockFreeForNow: "Déblocage gratuit pour l'instant — touchez ci-dessous.",
  unlockAlreadyDone: "Contact déjà débloqué.",
  unlockLimitReached: "Limite quotidienne atteinte. Réessayez demain.",
  unlockPaymentRequired: "Payez puis appuyez sur J'ai payé.",
  unlockMoveInTitle: "Coût d'emménagement estimé",
  unlockMoveInTotal: (rwf) => `Total : ${rwf.toLocaleString()} RWF`,
  marketTitle: "Carte des loyers",
  marketHeatMap: "Loyer moyen par quartier",
  diasporaTitle: "Mode diaspora",
  diasporaHint: "Le contact sera envoyé au WhatsApp de votre proche au Rwanda.",
  diasporaSave: "Enregistrer",
  referTitle: "Parrainer un ami",
  referShare: "Partager l'invitation",
  tenantVerifyTitle: "Vérification locataire",
  tenantVerifyId: "Vérifier avec pièce d'identité",
  tenantVerifyMomo: "Vérifier avec Mobile Money",
  pickFromGallery: "Choisir dans la galerie",
  flowPublish: "Publier",
  flowCancelPublish: "Annuler",
  landlordStatsTitle: "Performance (7 jours)",
  landlordBulkActivate: "Tout activer",
  landlordBulkDeactivate: "Tout désactiver",
  detailBedrooms: (n) => `${n} chambre(s)`,
  detailToilets: (n) => `${n} WC / salle(s) de bain`,
  detailElectricity: (meter) => `Électricité : ${meter}`,
  detailShare: "Partager l'annonce",
  detailRetry: "Réessayer",
  detailGallery: "Galerie",
  detailConcierge: "Guide emménagement",
  detailLease: "Modèle de bail",
  detailReportRented: "Déjà loué ?",
  searchFurnished: "Meublé",
  searchSecurity: "Gardien",
  searchElectricity: "Compteur",
  searchPropertyType: "Type de bien",
  searchMinBeds: "Chambres min.",
  searchMinToilets: "WC min.",
  searchSubtypeStudio: "Studio / bedsitter",
  searchSubtypeApartment: "1–3 chambres",
  searchSubtypeHouse: "Maisonette / bungalow",
  searchAnyType: "Tous types",
  savedAiCompare: "Comparer (IA)",
  marketTrendsTitle: "Tendances loyers",
  marketTrendLine: (area, pct) => `${area} : ${pct >= 0 ? "+" : ""}${pct.toFixed(0)} %`,
  tenantVerifiedBadge: "Locataire vérifié",
  tenantVerifyPrompt: "Vérifier mon profil",
  onboardingSkip: "Passer",
  onboardingNext: "Suivant",
  onboardingDone: "Commencer",
  onboardingTenant1Title: "Cherchez sur la carte",
  onboardingTenant1Body: "Trouvez des logements vérifiés près de vous ou filtrez par ville et loyer.",
  onboardingTenant2Title: "Débloquez le contact",
  onboardingTenant2Body: "Payez les frais (quand activé) pour appeler ou WhatsApp le propriétaire.",
  onboardingTenant3Title: "Enregistrez & comparez",
  onboardingTenant3Body: "Liste de favoris, alertes et comparaison des annonces.",
  onboardingLandlord1Title: "Vérifiez votre identité",
  onboardingLandlord1Body: "Les propriétaires vérifiés obtiennent plus de déblocages.",
  onboardingLandlord2Title: "Publiez avec vidéo",
  onboardingLandlord2Body: "Chaque annonce exige une vidéo de visite — la confiance des locataires.",
  onboardingLandlord3Title: "Suivez les stats",
  onboardingLandlord3Body: "Vues et déblocages, modifier le loyer, marquer comme loué.",
  lowDataMode: "Mode économie de data",
  lowDataHint: "Miniatures seulement — touchez pour charger photos/vidéo sur Wi‑Fi.",
  notificationInbox: "Notifications",
  notificationEmpty: "Aucune notification.",
  landlordGenerateLease: "Générer un bail",
  landlordAddPhotos: "Ajouter photos",
  landlordAddVideo: "Ajouter vidéo",
  landlordViewsUnlocks: (views, unlocks) => `${views} vues · ${unlocks} déblocages`,
  cachedResultsHint: "Résultats en cache — tirez pour actualiser en ligne.",
  errorRetry: "Réessayer",
  goToSearch: "Commencer la recherche",
  savedRemoveItem: "Retirer de la liste",
  savedCompareResult: "Résultat de comparaison",
  savedAiCompareTitle: "Comparaison IA",
  savedAiBestFit: "Meilleur choix",
  searchTownPlaceholder: "Kigali…",
  searchNeighbourhoodPlaceholder: "Kimironko, Remera, Kacyiru…",
  searchValidationLocation: "Indiquez région, ville ou quartier.",
  searchValidationRent: "Le loyer min doit être inférieur au max.",
  detailReportThanks: "Merci — notre équipe va examiner.",
  detailReportRentedThanks: "Merci — annonce masquée.",
  unlockSuccessHint: "Vous pouvez écrire au propriétaire maintenant.",
  unlockStepContact: "Afficher le numéro WhatsApp",
  searching: "Recherche de logements près de vous…",
  searchPlaceholder: "Kimironko, Remera, Kacyiru…",
  filters: "Filtres",
  filtersApply: "Voir les logements",
  filtersClear: "Effacer",
  filtersCount: (n) => (n === 0 ? "Filtres" : `${n} filtres`),
  mapView: "Carte",
  listView: "Liste",
  searchMeterPrepaid: "Compteur jetons",
  searchMeterPostpaid: "Facture postpayée",
  cardBeds: (n) => `${n} ch.`,
  cardBaths: (n) => `${n} sdb`,
  cardMonths: (n) => `${n} mois d'avance`,
  unlockWhy: "Payez ces frais pour obtenir le WhatsApp du propriétaire. Casa ne prend pas de commission sur le loyer.",
  unlockStepCopyLabel: "1. Copier le code",
  unlockStepPayLabel: "2. Payer avec Mobile Money",
  unlockStepConfirmLabel: "3. J’ai payé",
  unlockMessageWhatsApp: "Écrire sur WhatsApp",
  unlockShowNumber: "Afficher le numéro WhatsApp",
  listStepWhat: "Quoi",
  listStepWhere: "Où",
  listStepHome: "Le bien",
  listStepPhotos: "Photos",
  listStepOf: (n, total) => `${n} sur ${total}`,
  listPhotosHint: "Ajoutez au moins 5 photos — les locataires ignorent les annonces vides.",
  listAmenitiesNext: "Continuer",
  moreActions: "Plus",
  bulkConfirmActivate: "Activer toutes les annonces ?",
  bulkConfirmDeactivate: "Désactiver toutes les annonces ?",
  signupRoleHint: "Écrivez à Casa sur WhatsApp si vous vous trompez de profil.",
  loginCodeFailedHint:
    "Code non reçu ? Ouvrez WhatsApp, appuyez sur Envoyer, puis entrez le code que Casa envoie.",
  coachFilters: "Touchez Filtres pour le loyer, les chambres et le quartier.",
  coachListPhotos: "Ajoutez au moins 4 photos. Les locataires ignorent les annonces vides.",
  yourLandlords: "Vos propriétaires",
  accountYou: "Vous",
  accountActivity: "Activité",
  accountTools: "Outils",
  accountSettings: "Réglages",
  locationAsk: "Voir les logements près de vous",
  savedTitleShort: "Enregistrés",
  loginContinueBrowse: "Pas maintenant — continuer à parcourir",
  loginToContinue: "Connectez-vous pour enregistrer et obtenir le numéro du propriétaire.",
  guestAccountHint: "Parcourez librement. Connectez-vous pour enregistrer ou obtenir un contact.",
  filtersMore: "Plus de filtres",
  filtersLess: "Moins de filtres",
  listVideoRequired: "Une vidéo de visite est obligatoire avant de publier.",
  accountMoreTools: "Plus d’outils",
  menuBulkManage: "Gestion groupée",
  menuAgent: "Mode agent",
  menuOpenFull: "Ouvrir le menu WhatsApp",
  menuVerifyRequested: "Demande reçue. Notre équipe vérifiera votre pièce ou Mobile Money.",
  accountLogin: "Se connecter",
  signupConfirm: "Confirmer",
  signupConfirmTenant: "Je cherche un logement",
  signupConfirmLandlord: "Je publie des logements",
  tabInterest: "Intérêt",
  interestEmpty: "Personne n’a encore demandé un numéro",
  interestEmptyHint: "Quand un locataire demande le contact, il apparaît ici.",
  compareColRent: "Loyer",
  compareColArea: "Quartier",
  compareColBeds: "Ch.",
  locationTypeHint: "Type a neighbourhood — Kimironko, Remera, Kacyiru, Musanze…",
  unlockComingSoon: "Le contact reste gratuit pour le moment. Réessayez dans un instant.",
  notificationEmptyLine: "Aucune notification.",
};

export function t(lang: Language | undefined): Strings {
  return lang === "fr" ? fr : en;
}

export function loginT(useFrench: boolean): Strings {
  return useFrench ? fr : en;
}

export function langFromSignup(useFrench: boolean): Language {
  return useFrench ? "fr" : "en";
}
