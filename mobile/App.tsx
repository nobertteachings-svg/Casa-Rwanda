import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import type { CasaUser, Language } from "./src/api/client";
import { bootstrapSession, getMe, unregisterDeviceTokens } from "./src/api/client";
import { registerForPushNotifications } from "./src/notifications/register";
import { pushInboxItem } from "./src/storage/notification-inbox";
import { clearAuth, loadAuth } from "./src/storage/auth";
import { loadLanguagePref, saveLanguagePref } from "./src/storage/language";
import LoginScreen from "./src/screens/LoginScreen";
import MainShell from "./src/screens/MainShell";
import { parseListingIdFromUrl } from "./src/utils/deep-link";
import { CasaThemeProvider, useCasaTheme } from "./src/theme/ThemeContext";

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  return (
    <CasaThemeProvider>
      <AppBody fontsLoaded={fontsLoaded} />
    </CasaThemeProvider>
  );
}

function AppBody({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { gradient, colors } = useCasaTheme();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState<CasaUser | null>(null);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<Language>("en");
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const notificationSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const houseId = response.notification.request.content.data?.houseId;
      if (typeof houseId === "string" && houseId.length > 0) {
        setPendingListingId(houseId.toUpperCase());
      }
    });
    notificationSub.current = Notifications.addNotificationReceivedListener((notification) => {
      const houseId = notification.request.content.data?.houseId;
      const title = notification.request.content.title ?? "Casa";
      const body = notification.request.content.body ?? "";
      void pushInboxItem({
        title: String(title),
        body: String(body),
        houseId: typeof houseId === "string" ? houseId.toUpperCase() : undefined,
        receivedAt: new Date().toISOString(),
      });
    });
    return () => {
      notificationSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);

  useEffect(() => {
    function openListingFromUrl(url: string) {
      const houseId = parseListingIdFromUrl(url);
      if (houseId) setPendingListingId(houseId);
    }

    const sub = Linking.addEventListener("url", ({ url }) => openListingFromUrl(url));
    void Linking.getInitialURL().then((url) => {
      if (url) openListingFromUrl(url);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await saveLanguagePref("en");
        setUiLanguage("en");

        const saved = await loadAuth();
        if (!saved) return;
        const me = await getMe(saved.token);
        setToken(saved.token);
        setPhone(saved.phone);
        setUser(me.user);
        setNeedsSignup(me.needsSignup);
        setUiLanguage("en");
        if (me.needsSignup) {
          await bootstrapSession(saved.token, "en");
        }
        void registerForPushNotifications(saved.token);
      } catch {
        await clearAuth();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLoggedIn = useCallback(
    async (t: string, u: CasaUser | null, signup: boolean, savedPhone: string, language: Language) => {
      setToken(t);
      setUser(u);
      setNeedsSignup(signup);
      setPhone(savedPhone);
      setUiLanguage("en");
      setShowLogin(false);
      await saveLanguagePref("en");
      void registerForPushNotifications(t);
    },
    []
  );

  const handleUserUpdate = useCallback((u: CasaUser | null, signup: boolean) => {
    setUser(u);
    setNeedsSignup(signup);
    setUiLanguage("en");
  }, []);

  const handleLanguageChange = useCallback(async (_lang: Language) => {
    // Casa Rwanda is English-only at launch (Kinyarwanda later).
    setUiLanguage("en");
    await saveLanguagePref("en");
  }, []);

  const handleLogout = useCallback(async () => {
    if (token) {
      try {
        await unregisterDeviceTokens(token);
      } catch {
        /* ignore */
      }
    }
    await clearAuth();
    setToken(null);
    setUser(null);
    setPhone("");
    setNeedsSignup(false);
  }, [token]);

  if (loading || !fontsLoaded) {
    return (
      <LinearGradient colors={[...gradient.hero]} style={styles.center}>
        <ActivityIndicator size="large" color={colors.leafBright} />
        <StatusBar style="light" />
      </LinearGradient>
    );
  }

  return (
    <>
      <MainShell
        token={token ?? ""}
        phone={phone}
        user={user}
        needsSignup={needsSignup}
        uiLanguage={uiLanguage}
        onUserUpdate={handleUserUpdate}
        onLanguageChange={handleLanguageChange}
        onLogout={() => void handleLogout()}
        pendingListingId={pendingListingId}
        onPendingListingHandled={() => setPendingListingId(null)}
        onNeedLogin={() => setShowLogin(true)}
      />
      <Modal visible={showLogin && !token} animationType="slide" onRequestClose={() => setShowLogin(false)}>
        <LoginScreen
          onLoggedIn={(t, u, s, p, l) => void handleLoggedIn(t, u, s, p, l)}
          onDismiss={() => setShowLogin(false)}
        />
      </Modal>
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
