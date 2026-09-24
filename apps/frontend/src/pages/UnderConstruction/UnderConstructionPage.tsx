import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../components/BrandMark/BrandMark';
import styles from './UnderConstructionPage.module.css';

// Destino provisório dos links do login para telas que ainda não existem.
export function UnderConstructionPage({ title }: { title: string }) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <BrandMark />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>Esta tela ainda está em construção.</p>
        <Link to="/entrar" className={styles.back}>
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
