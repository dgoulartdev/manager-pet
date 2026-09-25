import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Pagination as PaginationInfo } from '@meupaciente/shared';
import { pluralize } from '../../lib/format';
import { Button } from '../Button/Button';
import styles from './Pagination.module.css';

interface PaginationProps {
  pagination: PaginationInfo;
  // Itens desta página (a última pode vir incompleta).
  shown: number;
  // Nome do item, para o total numa página só: ["tutor", "tutores"].
  unit: [singular: string, plural: string];
  onChange: (page: number) => void;
}

/** Rodapé da lista (DS): total à esquerda, anterior/próxima à direita. */
export function Pagination({ pagination, shown, unit, onChange }: PaginationProps) {
  const { page, per_page: perPage, total, total_pages: totalPages } = pagination;
  const first = (page - 1) * perPage + 1;
  const last = first + shown - 1;

  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <p className={styles.range}>
        {totalPages > 1 ? (
          <>
            <span className={styles.number}>
              {first}–{last}
            </span>{' '}
            de <span className={styles.number}>{total.toLocaleString('pt-BR')}</span>
          </>
        ) : (
          pluralize(total, ...unit)
        )}
      </p>
      {totalPages > 1 && (
        <div className={styles.pageButtons}>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <span className={styles.pageInfo}>
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Próxima página"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
          >
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
}
