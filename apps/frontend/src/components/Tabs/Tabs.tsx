import { useRef, type KeyboardEvent } from 'react';
import styles from './Tabs.module.css';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  // Prefixo dos ids: liga cada aba ao seu painel (aria-controls / aria-labelledby).
  idPrefix: string;
  label: string;
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
}

export const tabId = (prefix: string, id: string) => `${prefix}-aba-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-painel-${id}`;

/**
 * Abas do DS (facetas do mesmo recurso, máximo 4). Padrão ARIA: só a aba
 * ativa entra no Tab; setas, Home e End trocam de aba.
 */
export function Tabs<T extends string>({ idPrefix, label, items, value, onChange }: TabsProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    const targets: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(items[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div className={styles.tablist} role="tablist" aria-label={label}>
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, item.id)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, item.id)}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.label}
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
