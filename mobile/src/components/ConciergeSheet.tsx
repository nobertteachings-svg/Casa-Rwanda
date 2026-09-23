import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ConciergeContent } from "../api/client";
import { colors, radii, spacing } from "../theme/casa";

interface Props {
  visible: boolean;
  content: ConciergeContent | null;
  title: string;
  leaseLabel: string;
  reportRentedLabel: string;
  closeLabel: string;
  onClose: () => void;
  onLease?: () => void;
  onReportRented?: () => void;
}

export default function ConciergeSheet({
  visible,
  content,
  title,
  leaseLabel,
  reportRentedLabel,
  closeLabel,
  onClose,
  onLease,
  onReportRented,
}: Props) {
  if (!content) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView>
            <Text style={styles.section}>{content.checklist}</Text>
            <Text style={styles.section}>{content.negotiation}</Text>
            <Text style={styles.section}>{content.documents}</Text>
          </ScrollView>
          <View style={styles.row}>
            {onLease ? (
              <Pressable style={styles.btn} onPress={onLease}>
                <Text style={styles.btnText}>{leaseLabel}</Text>
              </Pressable>
            ) : null}
            {onReportRented ? (
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onReportRented}>
                <Text style={[styles.btnText, styles.btnTextSecondary]}>{reportRentedLabel}</Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>{closeLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.forest, marginBottom: spacing.md },
  section: { fontSize: 14, color: colors.ink, lineHeight: 21, marginBottom: spacing.md },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  btn: {
    backgroundColor: colors.leaf,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnSecondary: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  btnTextSecondary: { color: colors.leaf },
  close: { marginTop: spacing.md, alignItems: "center" },
  closeText: { color: colors.muted, fontWeight: "700" },
});
