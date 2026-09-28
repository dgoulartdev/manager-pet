// Mesmos limites da API (PUT /patients/{id}/photo).
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** Valida antes de enviar. Devolve a mensagem de erro, ou null se a foto serve. */
export function validatePhoto(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return 'Formato não aceito. Escolha uma imagem JPG ou PNG.';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `A imagem tem ${formatMegabytes(file.size)} MB; o limite é 5 MB.`;
  }
  return null;
}
