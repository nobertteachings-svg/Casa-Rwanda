import { Image, type ImageStyle } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const lockup = require("../../assets/casa_logo_lockup_horizontal.png");

/** Casa horizontal lockup — width-driven aspect ratio 3:2 */
export default function CasaLogo({
  width = 200,
  style,
}: {
  width?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const height = Math.round(width * (1024 / 1536));
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={lockup}
        style={[styles.img, { width, height }] as StyleProp<ImageStyle>}
        contentFit="contain"
        accessibilityLabel="Casa Rwanda"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-start" },
  img: {},
});
