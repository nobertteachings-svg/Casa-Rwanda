import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme/casa";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors so the app shows a recovery screen instead of closing. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Casa app error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Casa hit a problem</Text>
          <Text style={styles.body}>
            Please close and reopen the app. If this keeps happening, update from the Play Store once a
            fix is available.
          </Text>
          <Pressable style={styles.btn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.forest,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  btn: {
    backgroundColor: colors.leaf,
    borderRadius: radii.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
