import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "casa_app_token";
const PHONE_KEY = "casa_app_phone";

export async function saveAuth(token: string, phone: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(PHONE_KEY, phone);
}

export async function loadAuth(): Promise<{ token: string; phone: string } | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const phone = await SecureStore.getItemAsync(PHONE_KEY);
  if (!token || !phone) return null;
  return { token, phone };
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(PHONE_KEY);
}
