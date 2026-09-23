import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useVideoPlayer, VideoView, type VideoContentFit } from "expo-video";

interface Props {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: VideoContentFit;
  nativeControls?: boolean;
}

export default function CasaVideoPlayer({
  uri,
  style,
  contentFit = "contain",
  nativeControls = true,
}: Props) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      style={[styles.video, style]}
      contentFit={contentFit}
      nativeControls={nativeControls}
    />
  );
}

const styles = StyleSheet.create({
  video: { width: "100%", height: "100%" },
});
