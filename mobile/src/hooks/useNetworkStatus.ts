import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    void NetInfo.fetch().then((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => sub();
  }, []);

  return online;
}
