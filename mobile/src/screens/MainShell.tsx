import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { CasaUser, Language } from "../api/client";
import { getShortlist, getUnlockedContacts } from "../api/client";
import { t } from "../i18n/strings";
import { hasCompletedOnboarding, setOnboardingComplete, getLowDataMode, setLowDataMode } from "../storage/app-settings";
import { useCasaTheme } from "../theme/ThemeContext";
import CasaTabBar, { type TabItem } from "../components/CasaTabBar";
import AccountScreen, { type FlowLaunch } from "./AccountScreen";
import BrowseScreen from "./BrowseScreen";
import FlowWizardModal from "../components/FlowWizardModal";
import LandlordInterestScreen from "./LandlordInterestScreen";
import LandlordListingsScreen from "./LandlordListingsScreen";
import MenuScreen from "./MenuScreen";
import SavedScreen from "./SavedScreen";
import SignupScreen from "./SignupScreen";
import UnlockedContactsScreen from "./UnlockedContactsScreen";

interface Props {
  token: string;
  phone: string;
  user: CasaUser | null;
  needsSignup: boolean;
  uiLanguage: Language;
  onUserUpdate: (user: CasaUser | null, needsSignup: boolean) => void;
  onLanguageChange: (lang: Language) => void;
  onLogout: () => void;
  pendingListingId?: string | null;
  onPendingListingHandled?: () => void;
  onNeedLogin: () => void;
}

type TenantTab = "search" | "saved" | "contacts" | "menu" | "account";
type LandlordTab = "listings" | "interest" | "menu" | "account";

export default function MainShell({
  token,
  phone,
  user,
  needsSignup,
  uiLanguage,
  onUserUpdate,
  onLanguageChange,
  onLogout,
  pendingListingId,
  onPendingListingHandled,
  onNeedLogin,
}: Props) {
  const lang = "en" as const;
  const m = t(lang);
  const { ui } = useCasaTheme();
  const isLandlord = user?.role === "landlord" && !needsSignup;
  const guest = !token;

  const [tenantTab, setTenantTab] = useState<TenantTab>("search");
  const [landlordTab, setLandlordTab] = useState<LandlordTab>("listings");
  const [flow, setFlow] = useState<{
    mode: Exclude<FlowLaunch, null>;
    title: string;
    extrasPick?: string;
  } | null>(null);
  const [lastSearchDescription, setLastSearchDescription] = useState("");
  const [pushDetailId, setPushDetailId] = useState<string | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const [lowDataMode, setLowDataModeState] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);

  const refreshSavedCount = useCallback(async () => {
    if (isLandlord || !token) return;
    try {
      const [short, unlocked] = await Promise.all([getShortlist(token), getUnlockedContacts(token)]);
      setSavedCount(short.items.length);
      setContactCount(unlocked.contacts.length);
    } catch {
      /* ignore */
    }
  }, [isLandlord, token]);

  useEffect(() => {
    void getLowDataMode().then(setLowDataModeState);
    if (!user || needsSignup) return;
    void hasCompletedOnboarding(user.role).then((done) => {
      if (!done) setShowCoach(true);
    });
  }, [user, needsSignup]);

  useEffect(() => {
    void refreshSavedCount();
  }, [refreshSavedCount, tenantTab]);

  useEffect(() => {
    if (pendingListingId) {
      setTenantTab("search");
      setPushDetailId(pendingListingId);
      onPendingListingHandled?.();
    }
  }, [pendingListingId, onPendingListingHandled]);

  const dismissCoach = useCallback(async () => {
    if (user?.role) await setOnboardingComplete(user.role);
    setShowCoach(false);
  }, [user?.role]);

  const launchFlow = useCallback((mode: Exclude<FlowLaunch, null>, title: string, extrasPick?: string) => {
    setFlow({ mode, title, extrasPick });
  }, []);

  const tenantTabs: TabItem[] = useMemo(
    () => [
      { id: "search", label: m.tabBrowse, icon: "search-outline", iconActive: "search" },
      {
        id: "saved",
        label: m.tabSaved,
        icon: "bookmark-outline",
        iconActive: "bookmark",
        badge: savedCount,
      },
      { id: "contacts", label: m.tabContacts, icon: "people-outline", iconActive: "people", badge: contactCount },
      { id: "menu", label: m.tabMenu, icon: "grid-outline", iconActive: "grid" },
      { id: "account", label: m.tabAccount, icon: "person-circle-outline", iconActive: "person-circle" },
    ],
    [contactCount, m.tabAccount, m.tabBrowse, m.tabContacts, m.tabMenu, m.tabSaved, savedCount]
  );

  const landlordTabs: TabItem[] = useMemo(
    () => [
      { id: "listings", label: m.tabListings, icon: "home-outline", iconActive: "home" },
      { id: "interest", label: m.tabInterest, icon: "people-outline", iconActive: "people" },
      { id: "menu", label: m.tabMenu, icon: "grid-outline", iconActive: "grid" },
      { id: "account", label: m.tabAccount, icon: "person-circle-outline", iconActive: "person-circle" },
    ],
    [m.tabAccount, m.tabInterest, m.tabListings, m.tabMenu]
  );

  if (needsSignup && token) {
    return (
      <SignupScreen
        token={token}
        uiLanguage={uiLanguage}
        onLanguageChange={onLanguageChange}
        onComplete={(u) => onUserUpdate(u, false)}
      />
    );
  }

  return (
    <View style={ui.screen}>
      {isLandlord ? (
        <>
          <View style={[styles.tabPane, landlordTab !== "listings" && styles.tabHidden]}>
            <LandlordListingsScreen
              token={token}
              user={user}
              uiLanguage={uiLanguage}
              onStartVerify={() => launchFlow("verify", m.verifyBannerCta)}
              onStartList={() => launchFlow("list", m.actionListProperty)}
              showCoach={showCoach}
              onCoachDismissed={() => void dismissCoach()}
            />
          </View>
          <View style={[styles.tabPane, landlordTab !== "interest" && styles.tabHidden]}>
            <LandlordInterestScreen token={token} user={user} uiLanguage={uiLanguage} />
          </View>
          <View style={[styles.tabPane, landlordTab !== "menu" && styles.tabHidden]}>
            <MenuScreen
              token={token}
              user={user}
              uiLanguage={uiLanguage}
              onLaunchFlow={launchFlow}
              onNeedLogin={onNeedLogin}
              onLogout={onLogout}
            />
          </View>
          <View style={[styles.tabPane, landlordTab !== "account" && styles.tabHidden]}>
            <AccountScreen
              token={token}
              phone={phone}
              user={user}
              uiLanguage={uiLanguage}
              onUserUpdate={onUserUpdate}
              onLanguageChange={onLanguageChange}
              onLogout={onLogout}
              onLaunchFlow={launchFlow}
              onNeedLogin={onNeedLogin}
              lowDataMode={lowDataMode}
              onLowDataChange={(v) => {
                setLowDataModeState(v);
                void setLowDataMode(v);
              }}
            />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.tabPane, tenantTab !== "search" && styles.tabHidden]}>
            <BrowseScreen
              token={token}
              user={user}
              uiLanguage={uiLanguage}
              initialDetailId={pushDetailId}
              onInitialDetailHandled={() => setPushDetailId(null)}
              onSearchSaved={(desc) => setLastSearchDescription(desc)}
              onShortlistChange={() => void refreshSavedCount()}
              onUnlocked={() => void refreshSavedCount()}
              onNeedLogin={onNeedLogin}
              lowDataMode={lowDataMode}
              showCoach={showCoach}
              onCoachDismissed={() => void dismissCoach()}
            />
          </View>
          <View style={[styles.tabPane, tenantTab !== "saved" && styles.tabHidden]}>
            <SavedScreen
              token={token}
              user={user}
              uiLanguage={uiLanguage}
              lastSearchDescription={lastSearchDescription}
              onShortlistChange={() => void refreshSavedCount()}
              onGoToSearch={() => setTenantTab("search")}
              onUnlocked={() => void refreshSavedCount()}
              onNeedLogin={onNeedLogin}
            />
          </View>
          <View style={[styles.tabPane, tenantTab !== "contacts" && styles.tabHidden]}>
            <UnlockedContactsScreen
              token={token}
              user={user}
              uiLanguage={uiLanguage}
              onGoToSearch={() => setTenantTab("search")}
              onNeedLogin={onNeedLogin}
            />
          </View>
          <View style={[styles.tabPane, tenantTab !== "menu" && styles.tabHidden]}>
            <MenuScreen
              token={token}
              user={user}
              uiLanguage={uiLanguage}
              onLaunchFlow={launchFlow}
              onNeedLogin={onNeedLogin}
              onLogout={onLogout}
            />
          </View>
          <View style={[styles.tabPane, tenantTab !== "account" && styles.tabHidden]}>
            <AccountScreen
              token={token}
              phone={phone}
              user={user}
              uiLanguage={uiLanguage}
              onUserUpdate={onUserUpdate}
              onLanguageChange={onLanguageChange}
              onLogout={onLogout}
              onLaunchFlow={launchFlow}
              onNeedLogin={onNeedLogin}
              lowDataMode={lowDataMode}
              onLowDataChange={(v) => {
                setLowDataModeState(v);
                void setLowDataMode(v);
              }}
              onOpenListing={(id) => {
                setTenantTab("search");
                setPushDetailId(id);
              }}
              onOpenContacts={() => setTenantTab("contacts")}
              contactCount={contactCount}
            />
          </View>
        </>
      )}

      <CasaTabBar
        tabs={isLandlord ? landlordTabs : tenantTabs}
        active={isLandlord ? landlordTab : tenantTab}
        onChange={(id) => {
          if (isLandlord) setLandlordTab(id as LandlordTab);
          else setTenantTab(id as TenantTab);
        }}
      />

      {!guest ? (
        <FlowWizardModal
          visible={Boolean(flow)}
          token={token}
          user={user}
          uiLanguage={uiLanguage}
          title={flow?.title ?? ""}
          startMode={flow?.mode ?? "menu"}
          extrasPick={flow?.extrasPick}
          onClose={() => setFlow(null)}
          onUserUpdate={onUserUpdate}
          onComplete={() => setFlow(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabPane: { flex: 1 },
  tabHidden: { display: "none" },
});
