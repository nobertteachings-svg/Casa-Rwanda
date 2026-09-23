import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import CachedImage from "./CachedImage";
import CasaVideoPlayer from "./CasaVideoPlayer";
import type { PublicListingMedia } from "../api/client";
import { colors, radii, spacing } from "../theme/casa";

interface Props {
  visible: boolean;
  media: PublicListingMedia[];
  startIndex?: number;
  lowDataMode?: boolean;
  closeLabel: string;
  onClose: () => void;
}

export default function MediaGalleryModal({
  visible,
  media,
  startIndex = 0,
  lowDataMode = false,
  closeLabel,
  onClose,
}: Props) {
  const [idx, setIdx] = useState(startIndex);
  const current = media[idx];

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.close} onPress={onClose} accessibilityLabel={closeLabel}>
          <Text style={styles.closeText}>{closeLabel}</Text>
        </Pressable>
        {current?.type === "video" && !lowDataMode ? (
          <CasaVideoPlayer key={current.url} uri={current.url} style={styles.hero} />
        ) : current ? (
          <CachedImage uri={current.url} style={styles.hero} contentFit="contain" />
        ) : null}
        <ScrollView horizontal style={styles.thumbs} contentContainerStyle={styles.thumbsInner}>
          {media.map((item, i) => (
            <Pressable key={`${item.url}-${i}`} onPress={() => setIdx(i)}>
              <CachedImage
                uri={item.thumbUrl}
                style={[styles.thumb, i === idx && styles.thumbActive]}
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  close: { position: "absolute", top: 54, right: 16, zIndex: 2, padding: 8 },
  closeText: { color: colors.white, fontWeight: "800" },
  hero: { flex: 1, width: "100%" },
  thumbs: { maxHeight: 88, backgroundColor: "rgba(0,0,0,0.6)" },
  thumbsInner: { padding: spacing.sm, gap: spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: radii.sm, opacity: 0.7 },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: colors.leafBright },
});
