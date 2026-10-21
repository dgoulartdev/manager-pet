import {
  ACCEPTED_DOCUMENT_MIME_TYPES,
  compressExamFileIfNeeded,
  formatFileSize,
  MAX_BLOB_UPLOAD_BYTES,
  type CompressionResult,
  type CompressionRuntime,
} from './fileCompression';

export {
  ACCEPTED_DOCUMENT_MIME_TYPES,
  compressExamFileIfNeeded,
  formatFileSize,
  MAX_BLOB_UPLOAD_BYTES,
  type CompressionResult,
  type CompressionRuntime,
};

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'exame_sangue', label: 'Exame de sangue / laboratorial' },
  { value: 'raio_x', label: 'Radiografia (Raio-X)' },
  { value: 'ultrassom', label: 'Ultrassonografia' },
  { value: 'laudo', label: 'Laudo / parecer clínico' },
  { value: 'outro', label: 'Outro documento' },
] as const;

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPE_OPTIONS.map((item) => [item.value, item.label]),
);

export function describeDocumentType(type: string | null): string {
  if (!type) return 'Exame / documento';
  return TYPE_LABELS[type] ?? type;
}

export function describeDocumentFormat(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'image/png') return 'PNG';
  if (mimeType === 'image/jpeg') return 'JPG';
  return 'Arquivo';
}

export function defaultDocumentNameFromFilename(fileName: string): string {
  return fileName
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 120);
}
