import AsyncStorage from "@react-native-async-storage/async-storage";

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  houseId?: string;
  receivedAt: string;
  read: boolean;
}

const INBOX_KEY = "casa:notification-inbox";
const MAX_ITEMS = 40;

export async function loadInbox(): Promise<InboxItem[]> {
  const raw = await AsyncStorage.getItem(INBOX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as InboxItem[];
  } catch {
    return [];
  }
}

export async function pushInboxItem(item: Omit<InboxItem, "id" | "read">): Promise<void> {
  const list = await loadInbox();
  const entry: InboxItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    read: false,
  };
  const next = [entry, ...list].slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(next));
}

export async function markInboxRead(id: string): Promise<void> {
  const list = await loadInbox();
  const next = list.map((x) => (x.id === id ? { ...x, read: true } : x));
  await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(next));
}
