const SPEEDS = [0.75, 1, 1.5, 2];

export function ControlBar({
  index,
  total,
  playing,
  speed,
  chapters,
  chapter,
  onIndex,
  onPlaying,
  onSpeed,
}: {
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  chapters: { name: string; index: number }[] | null;
  chapter: string;
  onIndex: (index: number) => void;
  onPlaying: (playing: boolean) => void;
  onSpeed: (speed: number) => void;
}) {
  const empty = total <= 0;
  const atStart = empty || index <= 0;
  const atEnd = empty || index >= total - 1;
  return (
    <div className="controls">
      <div className="transport">
        <button type="button" onClick={() => onIndex(0)} disabled={atStart} aria-label="First step">
          <SkipStart />
        </button>
        <button type="button" onClick={() => onIndex(index - 1)} disabled={atStart} aria-label="Previous step">
          <Prev />
        </button>
        <button type="button" className="play" onClick={() => onPlaying(!playing)} disabled={empty} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause /> : <Play />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
        <button type="button" onClick={() => onIndex(index + 1)} disabled={atEnd} aria-label="Next step">
          <Next />
        </button>
        <button type="button" onClick={() => onIndex(total - 1)} disabled={atEnd} aria-label="Last step">
          <SkipEnd />
        </button>
      </div>
      <label className="scrub">
        <span>
          {empty ? "No steps yet" : `Step ${index + 1} / ${total}`}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={index}
          onChange={(event) => onIndex(Number(event.target.value))}
        />
      </label>
      {chapters && (
        <label className="chapter">
          <span>Jump</span>
          <select
            value={chapter}
            onChange={(event) => {
              const next = chapters.find((item) => item.name === event.target.value);
              if (next) onIndex(next.index);
            }}
          >
            {chapters.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {chapters && (
        <label className="speed">
          <span>Speed</span>
          <select value={String(speed)} onChange={(event) => onSpeed(Number(event.target.value))}>
            {SPEEDS.map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
      )}
      {chapters && <p className="keys">← → step · space play</p>}
    </div>
  );
}

function Play() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  );
}
function Pause() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 2h3v12h-3zm6 0h3v12h-3z" />
    </svg>
  );
}
function Prev() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.5 3 5 8l5.5 5z" />
    </svg>
  );
}
function Next() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.5 3 11 8l-5.5 5z" />
    </svg>
  );
}
function SkipStart() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 3h1.6v10H4zm8.2 0L6.6 8l5.6 5z" />
    </svg>
  );
}
function SkipEnd() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.8 3 9.4 8l-5.6 5zM10.4 3H12v10h-1.6z" />
    </svg>
  );
}
