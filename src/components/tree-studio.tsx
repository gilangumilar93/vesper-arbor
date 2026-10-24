import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Flower2, Leaf, RefreshCw } from "lucide-react";
import { PALETTES, getPalette, type PaletteId } from "@/lib/arbor/palettes";
import { DEFAULT_SETTINGS, generateTree, paint, type Settings } from "@/lib/arbor/tree";

const STORAGE_KEY = "vesper-arbor-v1";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function num(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function readSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Settings>;
    const paletteId = PALETTES.some((palette) => palette.id === data.paletteId)
      ? (data.paletteId as PaletteId)
      : DEFAULT_SETTINGS.paletteId;
    return {
      seed: Math.round(num(data.seed, 1, 1_000_000_000, DEFAULT_SETTINGS.seed)),
      angle: num(data.angle, 10, 50, DEFAULT_SETTINGS.angle),
      depth: Math.round(num(data.depth, 4, 10, DEFAULT_SETTINGS.depth)),
      length: num(data.length, 0.58, 0.78, DEFAULT_SETTINGS.length),
      wind: num(data.wind, 0, 1, DEFAULT_SETTINGS.wind),
      leaves: typeof data.leaves === "boolean" ? data.leaves : DEFAULT_SETTINGS.leaves,
      blossoms: typeof data.blossoms === "boolean" ? data.blossoms : DEFAULT_SETTINGS.blossoms,
      paletteId,
      bark: isHex(data.bark) ? data.bark : null,
      leaf: isHex(data.leaf) ? data.leaf : null,
      blossom: isHex(data.blossom) ? data.blossom : null,
    };
  } catch {
    return null;
  }
}

function windLabel(wind: number) {
  if (wind < 0.08) return "Still";
  if (wind < 0.28) return "Breath";
  if (wind < 0.55) return "Breeze";
  if (wind < 0.8) return "Gust";
  return "Gale";
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement;
  if (!parent) return null;
  const width = parent.clientWidth;
  const height = parent.clientHeight;
  if (width < 2 || height < 2) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const bufferW = Math.round(width * dpr);
  const bufferH = Math.round(height * dpr);
  if (canvas.width !== bufferW || canvas.height !== bufferH) {
    canvas.width = bufferW;
    canvas.height = bufferH;
  }
  return { width, height, dpr };
}

export function TreeStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [epoch, setEpoch] = useState(0);
  const [booted, setBooted] = useState(false);
  const settingsRef = useRef(settings);
  const epochRef = useRef(epoch);
  const reducedRef = useRef(false);
  settingsRef.current = settings;
  epochRef.current = epoch;

  const model = useMemo(
    () => generateTree(settings.seed, settings.angle, settings.depth, settings.length),
    [settings.seed, settings.angle, settings.depth, settings.length],
  );
  const modelRef = useRef(model);
  modelRef.current = model;

  useEffect(() => {
    const saved = readSettings();
    if (saved) setSettings(saved);
    setEpoch(1);
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!booted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* private mode */
    }
  }, [settings, booted]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedRef.current = media.matches;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !booted) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const sim = { epoch: -1, grow: 0, time: 0 };
    let frame = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (sim.epoch !== epochRef.current) {
        sim.epoch = epochRef.current;
        sim.grow = reducedRef.current ? 1 : 0;
      }
      sim.time += dt;
      if (sim.grow < 1) sim.grow = Math.min(1, sim.grow + dt / 3.2);
      const growth = reducedRef.current ? 1 : 1 - (1 - sim.grow) ** 3;
      const sized = resizeCanvas(canvas);
      if (sized) {
        paint(ctx, {
          ...sized,
          time: sim.time,
          dt,
          growth,
          reduced: reducedRef.current,
          settings: settingsRef.current,
          model: modelRef.current,
        });
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${growth})`;
        barRef.current.style.opacity = sim.grow >= 1 ? "0" : "1";
      }
      canvas.dataset.grown = sim.grow >= 1 ? "true" : "false";
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [booted]);

  const regenerate = useCallback(() => {
    setEpoch((value) => value + 1);
    setSettings((current) => ({
      ...current,
      seed: 1 + Math.floor(Math.random() * 999_999_999),
    }));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "r" && event.key !== "R") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      event.preventDefault();
      regenerate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [regenerate]);

  const palette = getPalette(settings.paletteId);
  const barkValue = settings.bark ?? palette.barkTip;
  const leafValue = settings.leaf ?? palette.leaf;
  const blossomValue = settings.blossom ?? palette.blossom;

  const patch = (partial: Partial<Settings>) => setSettings((current) => ({ ...current, ...partial }));

  return (
    <main className="studio">
      <section className="stage">
        <canvas ref={canvasRef} role="img" aria-label="Generative fractal tree swaying in the wind" />
      </section>
      <aside className="dock">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl leading-none text-balance text-parchment">Vesper Arbor</h1>
            <p className="mt-2 text-sm text-pretty text-mist">Grows in when you arrive, then keeps swaying.</p>
          </div>
          <p className="pt-1 text-xs tabular-nums text-mist">#{settings.seed}</p>
        </header>
        <div className="growbar" aria-hidden="true">
          <div ref={barRef} />
        </div>
        <p className="sr-only" aria-live="polite">
          {epoch > 1 ? `New tree, seed ${settings.seed}` : ""}
        </p>

        <div className="mt-4 grid grid-cols-5 gap-1">
          {PALETTES.map((item) => {
            const active = item.id === settings.paletteId;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => patch({ paletteId: item.id, bark: null, leaf: null, blossom: null })}
                className={cx(
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs",
                  active ? "bg-ink text-parchment ring-1 ring-gold" : "text-mist",
                )}
              >
                <span className="flex gap-1" aria-hidden="true">
                  <span className="size-2 rounded-full" style={{ background: item.barkTip }} />
                  <span className="size-2 rounded-full" style={{ background: item.leaf }} />
                  <span className="size-2 rounded-full" style={{ background: item.blossom }} />
                </span>
                {item.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <Slider
            label="Angle"
            value={`${Math.round(settings.angle)}°`}
            min={10}
            max={50}
            step={1}
            current={settings.angle}
            onChange={(angle) => patch({ angle })}
          />
          <Slider
            label="Depth"
            value={`${settings.depth}`}
            min={4}
            max={10}
            step={1}
            current={settings.depth}
            onChange={(depth) => patch({ depth })}
          />
          <Slider
            label="Length"
            value={`${Math.round(settings.length * 100)}%`}
            min={0.58}
            max={0.78}
            step={0.01}
            current={settings.length}
            onChange={(length) => patch({ length })}
          />
          <Slider
            label="Wind"
            value={windLabel(settings.wind)}
            min={0}
            max={1}
            step={0.01}
            current={settings.wind}
            onChange={(wind) => patch({ wind })}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Toggle
            pressed={settings.leaves}
            label="Leaves"
            onClick={() => patch({ leaves: !settings.leaves })}
            icon={<Leaf className="size-4" aria-hidden="true" />}
          />
          <Toggle
            pressed={settings.blossoms}
            label="Blossoms"
            onClick={() => patch({ blossoms: !settings.blossoms })}
            icon={<Flower2 className="size-4" aria-hidden="true" />}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <ColorField
            label="Bark"
            value={barkValue}
            onChange={(bark) => patch({ bark })}
          />
          <ColorField
            label="Leaf"
            value={leafValue}
            onChange={(leaf) => patch({ leaf })}
          />
          <ColorField
            label="Bloom"
            value={blossomValue}
            onChange={(blossom) => patch({ blossom })}
          />
        </div>

        <button
          type="button"
          onClick={regenerate}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gold px-4 text-sm font-medium text-gold-ink"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Regenerate
        </button>
      </aside>
    </main>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (value: number) => void;
}) {
  const id = label.toLowerCase();
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between text-sm">
        <span className="text-mist">{label}</span>
        <span className="tabular-nums text-parchment">{value}</span>
      </span>
      <input
        id={id}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        aria-valuetext={value}
        suppressHydrationWarning
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Toggle({
  pressed,
  label,
  onClick,
  icon,
}: {
  pressed: boolean;
  label: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cx(
        "flex min-h-11 items-center justify-center gap-2 rounded-full border text-sm",
        pressed ? "border-gold bg-ink text-gold" : "border-line text-mist",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = `color-${label.toLowerCase()}`;
  return (
    <label htmlFor={id} className="flex flex-col items-center gap-1 text-xs text-mist">
      <input
        id={id}
        className="swatch"
        type="color"
        value={value}
        aria-label={`${label} color`}
        suppressHydrationWarning
        onChange={(event) => onChange(event.target.value)}
      />
      {label}
    </label>
  );
}
