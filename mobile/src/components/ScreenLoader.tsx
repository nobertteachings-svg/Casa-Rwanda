import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  count?: number;
}

function ShimmerBlock({ style, color }: { style: ViewStyle; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.28, 0.72, 0.28],
  });

  return <Animated.View style={[style, { backgroundColor: color, opacity }]} />;
}

export default function ScreenLoader({ count = 3 }: Props) {
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <ShimmerBlock style={styles.thumb} color={colors.paper2} />
          <View style={styles.body}>
            <ShimmerBlock style={styles.lineShort} color={colors.paper2} />
            <ShimmerBlock style={styles.line} color={colors.paper2} />
            <ShimmerBlock style={styles.lineMedium} color={colors.paper2} />
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    wrap: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.xl },
    card: {
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      overflow: "hidden",
    },
    thumb: {
      height: 180,
      borderRadius: 0,
    },
    body: { padding: spacing.lg, gap: spacing.sm },
    line: { height: 12, borderRadius: 6 },
    lineShort: { width: "40%", height: 14, borderRadius: 6 },
    lineMedium: { width: "65%", height: 12, borderRadius: 6 },
  });
}
