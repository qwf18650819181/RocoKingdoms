import { useState } from "react";
import { ATTRIBUTE_COLORS } from "../data/attributes";

interface Props {
  attr: string;
  iconUrl?: string;
  size?: number;
}

export function AttributeIcon({ attr, iconUrl, size = 18 }: Props) {
  const [broken, setBroken] = useState(false);

  if (iconUrl && !broken) {
    return (
      <img
        src={iconUrl}
        alt={attr}
        title={attr}
        className="attr-icon-img"
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className="attr-icon-fallback"
      style={{
        width: size,
        height: size,
        backgroundColor: ATTRIBUTE_COLORS[attr] ?? "#888",
      }}
      title={attr}
    />
  );
}
