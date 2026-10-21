/**
 * Abstração de storage para documentos e exames do paciente (ADR-005 / ADR-007).
 *
 * Duas implementações: disco local no desenvolvimento e Vercel Blob em produção,
 * escolhidas no DocumentsModule. O DocumentsService só conhece este contrato.
 */

export interface UploadedDocumentFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
}

export interface DocumentStorage {
  // Salva o arquivo do documento e devolve a URL de acesso.
  save(documentId: string, file: UploadedDocumentFile): Promise<string>;

  // Remove o arquivo apontado pela URL. Idempotente: não falha se já não existe.
  remove(documentUrl: string): Promise<void>;
}

export const DOCUMENT_STORAGE = Symbol('DOCUMENT_STORAGE');

export function extensionForDocumentMime(mimetype: string): 'pdf' | 'png' | 'jpg' {
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype === 'image/png') return 'png';
  return 'jpg';
}

/**
 * Confere a assinatura binária (magic bytes) do arquivo contra o MIME declarado,
 * evitando que arquivos corrompidos ou de outro formato sejam gravados no storage.
 */
export function verifyDocumentMagicBytes(buffer: Buffer, mimetype: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  if (mimetype === 'application/pdf') {
    // O cabeçalho %PDF- pode aparecer nos primeiros 1024 bytes segundo a especificação PDF.
    const head = buffer.subarray(0, Math.min(buffer.length, 1024)).toString('latin1');
    return head.includes('%PDF-');
  }

  if (mimetype === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimetype === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  return false;
}
