import { initialsOf } from '../../lib/format';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  // paciente usa o acento terracota; pessoa (usuário, tutor) usa o primário.
  kind: 'patient' | 'person';
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Decorativo: o nome sempre aparece ao lado, então o avatar fica fora da leitura de tela.
export function Avatar({ name, kind, photoUrl, size = 'md' }: AvatarProps) {
  return (
    <span className={`${styles.avatar} ${styles[kind]} ${styles[size]}`} aria-hidden="true">
      {photoUrl ? <img className={styles.photo} src={photoUrl} alt="" /> : initialsOf(name)}
    </span>
  );
}
