// Mesmos formatos da API (PUT /patients/{id}/photo).
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png'];

// Lado maior da foto enviada: sobra para o prontuário e deixa o arquivo com algumas
// centenas de KB — foto de celular tem vários MB, e a Vercel recusa requisições
// acima de 4,5 MB.
const MAX_PHOTO_SIDE = 1280;
const JPEG_QUALITY = 0.85;
// Abaixo disso, uma foto que já cabe no lado máximo sobe como veio.
const SMALL_PHOTO_BYTES = 1024 * 1024;

export type PreparedPhoto = { photo: File } | { error: string };

/**
 * Prepara a foto escolhida para o envio: confere o formato e a reduz no navegador
 * (lado maior até 1280 px, em JPEG). Devolve a foto pronta ou a mensagem de erro.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return { error: 'Formato não aceito. Escolha uma imagem JPG ou PNG.' };
  }
  try {
    return { photo: await shrinkPhoto(file) };
  } catch {
    return { error: 'Não foi possível abrir esta imagem. Escolha outra.' };
  }
}

async function shrinkPhoto(file: File): Promise<File> {
  // 'from-image' aplica a rotação gravada pela câmera (EXIF), senão a foto pode sair deitada.
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(image.width, image.height));
    if (scale === 1 && file.size <= SMALL_PHOTO_BYTES) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível.');
    // JPEG não tem transparência: sem um fundo, um PNG transparente ficaria preto.
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) throw new Error('Falha ao gerar o JPEG.');
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally {
    image.close();
  }
}
