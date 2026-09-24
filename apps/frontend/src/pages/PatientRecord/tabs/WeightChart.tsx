import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatDate, parseDateOnly } from '../../../lib/dates';
import { formatWeight, formatWeightChange, type Weighing } from '../../../lib/weights';
import styles from './WeightChart.module.css';

interface WeightChartProps {
  data: Weighing[]; // ordem cronológica, pelo menos 2 pontos
}

const MARGIN = { top: 32, right: 64, bottom: 32, left: 48 };
const TICK_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20];
const MAX_X_LABELS = 6;

// Degrau "redondo" que dá de 3 a 5 marcas no eixo Y, já contando a folga acima e abaixo.
function niceScale(min: number, max: number) {
  const range = Math.max(max - min, 0.4);
  const padded = range * 1.3;
  const step = TICK_STEPS.find((candidate) => padded / candidate <= 4) ?? 50;
  const low = Math.floor((min - range * 0.15) / step) * step;
  const high = Math.ceil((max + range * 0.15) / step) * step;
  const ticks: number[] = [];
  for (let value = Math.max(0, low); value <= high + step / 2; value += step) {
    ticks.push(Math.round(value * 100) / 100);
  }
  // Todas as marcas com as mesmas casas decimais do degrau ("4,0 / 4,5", não "4 / 4,5").
  const decimals = step >= 1 ? 0 : step >= 0.1 && Number.isInteger(step * 10) ? 1 : 2;
  const format = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return { low: Math.max(0, low), high, ticks, format: (value: number) => format.format(value) };
}

/**
 * Curva de peso: série única, linha de 2px no acento terracota (DS: o acento é
 * o gráfico de evolução de peso; o teal fica só para ações). Sem legenda — o
 * título diz o que é. Crosshair + tooltip no ponteiro e setas no teclado.
 * A tabela ao lado traz os mesmos valores: o tooltip nunca é o único caminho.
 */
export function WeightChart({ data }: WeightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Proporção ~16:6, com piso e teto para caber bem no celular e no desktop.
  const height = Math.round(Math.min(280, Math.max(200, width * 0.375)));
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;

  const times = data.map((point) => parseDateOnly(point.date).getTime());
  const firstTime = times[0];
  const span = Math.max(times.at(-1)! - firstTime, 1);
  const weights = data.map((point) => point.weight);
  const scale = niceScale(Math.min(...weights), Math.max(...weights));

  const x = (index: number) => MARGIN.left + ((times[index] - firstTime) / span) * plotWidth;
  const y = (weight: number) =>
    MARGIN.top + plotHeight - ((weight - scale.low) / (scale.high - scale.low)) * plotHeight;

  const linePath = data
    .map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.weight)}`)
    .join(' ');
  const baseline = MARGIN.top + plotHeight;
  const areaPath = `${linePath} L${x(data.length - 1)},${baseline} L${x(0)},${baseline} Z`;

  // Rótulos do eixo X: até 6, espaçados entre os pontos reais (nunca datas inventadas).
  const labelEvery = Math.ceil(data.length / MAX_X_LABELS);
  const longSpan = span > 330 * 86_400_000;
  const xLabelIndexes = data
    .map((_, index) => index)
    .filter((index) => index % labelEvery === 0 || index === data.length - 1)
    .filter(
      (index, position, list) =>
        position === list.length - 1 || x(list[position + 1]) - x(index) > 44,
    );
  const xLabel = (value: string) => {
    const date = parseDateOnly(value);
    return longSpan
      ? date.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' })
      : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  function handlePointer(event: PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const pointerX = event.clientX - box.left;
    let nearest = 0;
    for (let index = 1; index < data.length; index++) {
      if (Math.abs(x(index) - pointerX) < Math.abs(x(nearest) - pointerX)) nearest = index;
    }
    setActive(nearest);
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const last = data.length - 1;
    const current = active ?? last;
    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, current - 1),
      ArrowRight: Math.min(last, current + 1),
      Home: 0,
      End: last,
    };
    if (moves[event.key] === undefined) return;
    event.preventDefault();
    setActive(moves[event.key]);
  }

  const lastIndex = data.length - 1;
  const activePoint = active !== null ? data[active] : null;
  const previousPoint = active !== null && active > 0 ? data[active - 1] : null;
  const summary = `Curva de peso: ${data.length} pesagens, de ${formatDate(data[0].date)} a ${formatDate(
    data[lastIndex].date,
  )}, entre ${formatWeight(Math.min(...weights))} e ${formatWeight(Math.max(...weights))}. Use as setas para percorrer.`;

  return (
    <div
      ref={containerRef}
      className={styles.chart}
      tabIndex={0}
      role="group"
      aria-labelledby={titleId}
      onKeyDown={handleKey}
      onFocus={() => setActive((current) => current ?? lastIndex)}
      onBlur={() => setActive(null)}
    >
      <span id={titleId} className="visually-hidden">
        {summary}
      </span>
      <svg width={width} height={height} className={styles.svg} aria-hidden="true">
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
              className={styles.grid}
            />
            <text
              x={MARGIN.left - 10}
              y={y(tick)}
              className={styles.yTick}
              dominantBaseline="middle"
            >
              {scale.format(tick)}
            </text>
          </g>
        ))}
        <text x={MARGIN.left - 10} y={12} className={styles.unit}>
          kg
        </text>

        {xLabelIndexes.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 8}
            className={styles.xTick}
            textAnchor="middle"
          >
            {xLabel(data[index].date)}
          </text>
        ))}

        <path d={areaPath} className={styles.area} />
        <path d={linePath} className={styles.line} />

        {activePoint && active !== null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={MARGIN.top}
            y2={baseline}
            className={styles.crosshair}
          />
        )}

        {data.map((point, index) => (
          <circle
            key={point.appointmentId}
            cx={x(index)}
            cy={y(point.weight)}
            r={index === active ? 6 : 4}
            className={styles.dot}
          />
        ))}

        {/* Rótulo direto só no último ponto: o valor que mais importa. */}
        <text
          x={x(lastIndex) + 12}
          y={y(data[lastIndex].weight)}
          className={styles.endLabel}
          dominantBaseline="middle"
        >
          {formatWeight(data[lastIndex].weight)}
        </text>

        <rect
          x={MARGIN.left - 12}
          y={0}
          width={plotWidth + 24}
          height={height}
          fill="transparent"
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setActive(null)}
        />
      </svg>

      {activePoint && active !== null && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(Math.max(x(active), 80), width - 80),
            top: Math.max(y(activePoint.weight) - 12, 0),
          }}
          aria-live="polite"
        >
          <span className={styles.tooltipValue}>{formatWeight(activePoint.weight)}</span>
          <span className={styles.tooltipMeta}>
            {formatDate(activePoint.date)}
            {previousPoint && ` · ${formatWeightChange(activePoint.weight - previousPoint.weight)}`}
          </span>
        </div>
      )}
    </div>
  );
}
