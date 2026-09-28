import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TextField, type TextFieldProps } from './TextField';
import styles from './PasswordField.module.css';

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing'>;

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false);
    const Icon = visible ? EyeOff : Eye;

    return (
      <TextField
        ref={ref}
        {...props}
        type={visible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            className={styles.toggle}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        }
      />
    );
  },
);
