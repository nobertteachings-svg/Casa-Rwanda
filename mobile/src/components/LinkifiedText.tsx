import { Linking, StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { openHttpUrl } from "../utils/contact";

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const PHONE_RE = /(\+?\d[\d\s\-()]{7,}\d)/g;

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
}

function openUrl(raw: string): void {
  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  openHttpUrl(url);
}

function openTel(raw: string): void {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 8) void Linking.openURL(`tel:+${digits}`);
}

export default function LinkifiedText({ text, style }: Props) {
  const parts: { t: string; kind: "text" | "url" | "phone" }[] = [];
  let rest = text;

  while (rest.length > 0) {
    URL_RE.lastIndex = 0;
    PHONE_RE.lastIndex = 0;
    const urlMatch = URL_RE.exec(rest);
    const phoneMatch = PHONE_RE.exec(rest);

    const urlIdx = urlMatch?.index ?? Infinity;
    const phoneIdx = phoneMatch?.index ?? Infinity;
    const nextIdx = Math.min(urlIdx, phoneIdx);

    if (nextIdx === Infinity) {
      parts.push({ t: rest, kind: "text" });
      break;
    }

    if (nextIdx > 0) parts.push({ t: rest.slice(0, nextIdx), kind: "text" });

    if (urlIdx <= phoneIdx && urlMatch) {
      parts.push({ t: urlMatch[0], kind: "url" });
      rest = rest.slice(urlIdx + urlMatch[0].length);
    } else if (phoneMatch) {
      parts.push({ t: phoneMatch[0], kind: "phone" });
      rest = rest.slice(phoneIdx + phoneMatch[0].length);
    }
  }

  return (
    <Text style={style}>
      {parts.map((p, i) => {
        if (p.kind === "url") {
          return (
            <Text key={i} style={styles.link} onPress={() => openUrl(p.t)}>
              {p.t}
            </Text>
          );
        }
        if (p.kind === "phone") {
          return (
            <Text key={i} style={styles.link} onPress={() => openTel(p.t)}>
              {p.t}
            </Text>
          );
        }
        return <Text key={i}>{p.t}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: "#128c7e", textDecorationLine: "underline" },
});
