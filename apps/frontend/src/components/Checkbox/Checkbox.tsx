import type { InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import styles from './Checkbox.module.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

/** Checkbox nativo com aparência do DS. A área clicável é o rótulo inteiro. */
export function Checkbox({ label, className, ...inputProps }: CheckboxProps) {
  return (
    <label className={[styles.checkbox, className ?? ''].join(' ')}>
      <input type="checkbox" className={styles.input} {...inputProps} />
      <span className={styles.box} aria-hidden="true">
        <Check size={16} strokeWidth={3} />
      </span>
      <span className={styles.label}>{label}</span>
    </label>
  );
}
