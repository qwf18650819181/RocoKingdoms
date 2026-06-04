import {
  ATTRIBUTE_COLORS,
  attrLabelTextColor,
  attrShortLabel,
} from "../data/attributes";

interface Props {
  attr: string;
  title?: string;
}

export function TypeChar({ attr, title }: Props) {
  const bg = ATTRIBUTE_COLORS[attr] ?? "#888";
  const label = attrShortLabel(attr);

  return (
    <span
      className="type-char"
      style={{ backgroundColor: bg, color: attrLabelTextColor(bg) }}
      title={title ?? attr}
    >
      {label}
    </span>
  );
}
