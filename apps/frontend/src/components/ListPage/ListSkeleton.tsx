import styles from './ListSkeleton.module.css';

// DS: esqueleto de 5 linhas no carregamento.
export function ListSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.skeleton} role="status">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className={styles.row} aria-hidden="true">
          <span className={styles.avatar} />
          <span className={styles.lines}>
            <span />
            <span />
          </span>
        </div>
      ))}
    </div>
  );
}
