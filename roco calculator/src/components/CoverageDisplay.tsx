import { TypeChar } from "./TypeChar";

interface ListProps {
  attrs: string[];
}

/** 打击面：横向彩色单字（仅目标属性） */
export function CoverageList({ attrs }: ListProps) {
  if (attrs.length === 0) {
    return <span className="coverage-display__empty">—</span>;
  }

  return (
    <span className="coverage-display coverage-display--list">
      {attrs.map((attr, index) => (
        <span key={attr} className="coverage-display__item">
          {index > 0 ? <span className="coverage-display__gap" /> : null}
          <TypeChar attr={attr} />
        </span>
      ))}
    </span>
  );
}
