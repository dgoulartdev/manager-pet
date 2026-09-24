import { useId, type ReactNode } from 'react';
import styles from './Segmented.module.css';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  legend: string;
  name: string;
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  optional?: boolean;
  // Conteúdo logo abaixo das opções (ex.: campo que aparece com "Outra").
  children?: ReactNode;
}

/**
 * Escolha única entre 2–3 opções sempre visíveis (DS: segmented em vez de select).
 * É um grupo de rádios nativo: setas, Tab e leitor de tela funcionam sem código extra.
 */
export function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  optional,
  children,
}: SegmentedProps<T>) {
  const groupId = useId();

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        {legend}
        {optional && <span className={styles.optional}> (opcional)</span>}
      </legend>
      <div
        className={styles.track}
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              className={styles.input}
              name={`${name}-${groupId}`}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className={styles.segment}>{option.label}</span>
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  );
}
