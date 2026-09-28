import { meetsPasswordRule } from '../../lib/validation';
import styles from './PasswordStrength.module.css';

type StrengthLevel = 1 | 2 | 3 | 4;

const LABELS: Record<StrengthLevel, string> = {
  1: 'Fraca',
  2: 'Média',
  3: 'Boa',
  4: 'Forte',
};

/**
 * Nível 1 = ainda não cumpre a regra da API (8+ caracteres, letra e número).
 * Cumprida a regra, sobe com o comprimento e com a variedade de caracteres.
 * É só uma orientação: quem decide se a senha é aceita é a regra da API.
 */
export function getPasswordStrength(password: string): StrengthLevel {
  if (!meetsPasswordRule(password)) return 1;
  let level = 2;
  if (password.length >= 12) level += 1;
  const mixesCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (mixesCase || hasSymbol) level += 1;
  return level as StrengthLevel;
}

interface PasswordStrengthProps {
  id: string;
  password: string;
}

// Cor nunca sozinha: o nível também aparece escrito ao lado dos segmentos.
export function PasswordStrength({ id, password }: PasswordStrengthProps) {
  if (!password) return null;
  const level = getPasswordStrength(password);

  return (
    <div id={id} className={styles.meter} data-level={level}>
      <div className={styles.segments} aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span key={segment} className={segment <= level ? styles.filled : styles.segment} />
        ))}
      </div>
      <span className={styles.label}>
        <span className="visually-hidden">Força da senha: </span>
        {LABELS[level]}
      </span>
    </div>
  );
}
