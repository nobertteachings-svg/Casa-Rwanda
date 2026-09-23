import { api } from "../api/client";

export function MediaImage({ refId, alt }: { refId: string; alt: string }) {
  if (refId?.startsWith("cloudinary:")) {
    return (
      <img
        src={api.mediaUrl(refId)}
        alt={alt}
        className="media-img"
        loading="lazy"
      />
    );
  }
  if (!refId?.startsWith("wa-media:")) {
    return <div className="media-placeholder">No image</div>;
  }
  return (
    <img
      src={api.mediaUrl(refId)}
      alt={alt}
      className="media-img"
      loading="lazy"
    />
  );
}
