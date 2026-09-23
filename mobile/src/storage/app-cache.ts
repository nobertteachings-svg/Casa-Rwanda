import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SearchListing } from "../api/client";

const SEARCH_CACHE_KEY = "casa:search-cache";

export interface CachedSearch {
  listings: SearchListing[];
  total: number;
  updatedAt: string;
  savedAt: string;
}

export async function saveSearchCache(data: Omit<CachedSearch, "savedAt">): Promise<void> {
  const payload: CachedSearch = { ...data, savedAt: new Date().toISOString() };
  await AsyncStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(payload));
}

export async function loadSearchCache(): Promise<CachedSearch | null> {
  const raw = await AsyncStorage.getItem(SEARCH_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedSearch;
  } catch {
    return null;
  }
}
