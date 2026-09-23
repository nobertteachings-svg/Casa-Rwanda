import { Image, type ImageProps } from "expo-image";

type Props = Omit<ImageProps, "source"> & {
  uri: string;
};

export default function CachedImage({ uri, style, contentFit = "cover", ...rest }: Props) {
  return (
    <Image
      {...rest}
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={200}
    />
  );
}
