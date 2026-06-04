import type { Spirit } from "../types/spirit";

interface Props {
  chain: Spirit[];
  currentId: number;
  showImages?: boolean;
  onSelectSpirit?: (id: number) => void;
}

export function SpiritEvolutionDiagram({
  chain,
  currentId,
  showImages = true,
  onSelectSpirit,
}: Props) {
  if (chain.length <= 1) return null;

  return (
    <section className="detail-section evolution-chain" aria-label="进化链">
      <h3>进化</h3>
      <div className="evolution-chain__track">
        {chain.map((node, index) => (
          <div key={node.id} className="evolution-chain__step">
            {index > 0 ? (
              <span className="evolution-chain__arrow" aria-hidden>
                →
              </span>
            ) : null}
            <button
              type="button"
              className={`evolution-chain__node${
                node.id === currentId ? " evolution-chain__node--current" : ""
              }`}
              title={node.页面标题 || node.名称}
              disabled={!onSelectSpirit}
              onClick={() => onSelectSpirit?.(node.id)}
            >
              {showImages && node.立绘链接 ? (
                <img
                  className="evolution-chain__portrait"
                  src={node.立绘链接}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="evolution-chain__portrait evolution-chain__portrait--empty" />
              )}
              <span className="evolution-chain__name">{node.名称}</span>
              <span className="evolution-chain__stage">{node.精灵阶段}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
