import {
  ACCEPTED_DOCUMENT_MIME_TYPES,
  MAX_BLOB_UPLOAD_BYTES,
  type AcceptedDocumentMimeType,
} from '@meupaciente/shared';

export { ACCEPTED_DOCUMENT_MIME_TYPES, MAX_BLOB_UPLOAD_BYTES, type AcceptedDocumentMimeType };

// Parâmetros mínimos de fidelidade diagnóstica para radiografias e ultrassonografias:
// nunca reduzimos abaixo de 2048 px no lado maior nem abaixo de qualidade 0,90.
export const DIAGNOSTIC_IMAGE_STEPS = [
  { maxSide: 3072, quality: 0.92 },
  { maxSide: 2560, quality: 0.92 },
  { maxSide: 2560, quality: 0.9 },
  { maxSide: 2048, quality: 0.9 },
] as const;

export const DIAGNOSTIC_PNG_LOSSLESS_SIDES = [Infinity, 3072, 2560] as const;

export const DIAGNOSTIC_PNG_FALLBACK_JPEG_STEPS = [
  { maxSide: 3072, quality: 0.95 },
  { maxSide: 3072, quality: 0.92 },
  { maxSide: 2560, quality: 0.92 },
] as const;

// Tamanho mínimo de stream de imagem embutida em PDF para ser candidata à otimização (150 KB).
const MIN_PDF_IMAGE_STREAM_BYTES = 150 * 1024;

export interface DecodedRasterImage {
  width: number;
  height: number;
  hasAlphaTransparency: boolean;
  encode(options: {
    mimeType: 'image/png' | 'image/jpeg';
    maxSide: number;
    quality?: number;
  }): Promise<{ bytes: Uint8Array; width: number; height: number }>;
  close(): void;
}

export interface CompressionRuntime {
  decodeImage(bytes: Uint8Array, mimeType: string): Promise<DecodedRasterImage>;
  deflate?(bytes: Uint8Array): Promise<Uint8Array>;
}

export type CompressionResult =
  | {
      status: 'ok';
      file: File;
      wasCompressed: boolean;
      originalSize: number;
      finalSize: number;
      strategy:
        | 'original'
        | 'png-lossless'
        | 'png-diagnostic-jpeg'
        | 'jpeg-diagnostic'
        | 'pdf-lossless'
        | 'pdf-diagnostic-images';
    }
  | {
      status: 'error';
      reason: 'unsupported-format' | 'corrupted-file' | 'exceeds-limit-after-compression';
      error: string;
      originalSize: number;
      attemptedSize?: number;
    };

/**
 * Formata bytes para leitura humana (ex.: "65 KB", "1,3 MB", "7,0 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1).replace('.', ',')} MB`;
}

/**
 * Identifica o formato real pelos bytes de assinatura (magic bytes) e pelo MIME/extensão.
 * Retorna `null` se o formato não for suportado, ou `'mismatch'` se a assinatura
 * binária contradisser o formato declarado (arquivo corrompido ou renomeado).
 */
export function detectExamFormat(
  bytes: Uint8Array,
  declaredMimeType: string,
  fileName: string,
): AcceptedDocumentMimeType | 'mismatch' | null {
  const lowerName = fileName.toLowerCase();
  const normalizedMime =
    declaredMimeType === 'image/jpg' ? 'image/jpeg' : declaredMimeType;

  let expected: AcceptedDocumentMimeType | null = null;
  if (
    ACCEPTED_DOCUMENT_MIME_TYPES.includes(
      normalizedMime as AcceptedDocumentMimeType,
    )
  ) {
    expected = normalizedMime as AcceptedDocumentMimeType;
  } else if (lowerName.endsWith('.pdf')) {
    expected = 'application/pdf';
  } else if (lowerName.endsWith('.png')) {
    expected = 'image/png';
  } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    expected = 'image/jpeg';
  }

  if (!expected) return null;
  if (bytes.byteLength < 4) return 'mismatch';

  const actual = detectSignature(bytes);
  if (!actual || actual !== expected) return 'mismatch';
  return expected;
}

function detectSignature(bytes: Uint8Array): AcceptedDocumentMimeType | null {
  if (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  // O cabeçalho %PDF- pode estar nos primeiros 1024 bytes do arquivo.
  const headLimit = Math.min(bytes.byteLength, 1024);
  for (let i = 0; i <= headLimit - 5; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return 'application/pdf';
    }
  }

  return null;
}

/**
 * Trata o arquivo antes do upload para o Vercel Blob (limite serverless de 4,5 MB):
 * - Arquivos <= 4,5 MB são preservados bit a bit sem qualquer modificação.
 * - Arquivos > 4,5 MB passam por estratégias específicas de cada formato que
 *   preservam a qualidade diagnóstica (radiografias, ultrassonografias e laudos).
 * - Após o processamento, o tamanho é revalidado contra o limite de 4,5 MB;
 *   se ainda exceder, o upload é bloqueado em vez de degradar a imagem.
 */
export async function compressExamFileIfNeeded(
  file: File,
  runtime: CompressionRuntime = browserCompressionRuntime,
): Promise<CompressionResult> {
  const originalSize = file.size;
  if (originalSize === 0) {
    return {
      status: 'error',
      reason: 'corrupted-file',
      error: 'O arquivo selecionado está vazio ou corrompido.',
      originalSize: 0,
    };
  }

  const headSlice = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const format = detectExamFormat(headSlice, file.type, file.name);

  if (format === null) {
    return {
      status: 'error',
      reason: 'unsupported-format',
      error: 'Formato não aceito. Escolha um exame em PDF, JPG ou PNG.',
      originalSize,
    };
  }

  if (format === 'mismatch') {
    return {
      status: 'error',
      reason: 'corrupted-file',
      error:
        'O conteúdo do arquivo não corresponde ao formato informado ou está corrompido.',
      originalSize,
    };
  }

  // Arquivos já dentro do limite de 4,5 MB seguem intactos, sem reprocessamento.
  if (originalSize <= MAX_BLOB_UPLOAD_BYTES) {
    const normalizedFile =
      file.type === format
        ? file
        : new File([file], file.name, {
            type: format,
            lastModified: file.lastModified,
          });

    return {
      status: 'ok',
      file: normalizedFile,
      wasCompressed: false,
      originalSize,
      finalSize: normalizedFile.size,
      strategy: 'original',
    };
  }

  const fullBytes = new Uint8Array(await file.arrayBuffer());

  if (format === 'image/png') {
    return compressDiagnosticPng(file, fullBytes, runtime);
  }

  if (format === 'image/jpeg') {
    return compressDiagnosticJpeg(file, fullBytes, runtime);
  }

  return compressDiagnosticPdf(file, fullBytes, runtime);
}

async function compressDiagnosticPng(
  originalFile: File,
  bytes: Uint8Array,
  runtime: CompressionRuntime,
): Promise<CompressionResult> {
  const originalSize = originalFile.size;
  let decoded: DecodedRasterImage;
  try {
    decoded = await runtime.decodeImage(bytes, 'image/png');
  } catch {
    return {
      status: 'error',
      reason: 'corrupted-file',
      error: 'Não foi possível abrir esta imagem PNG. Verifique se o arquivo está íntegro.',
      originalSize,
    };
  }

  let smallestAttempt = originalSize;
  try {
    // 1. Tenta manter o formato PNG sem perdas (lossless), primeiro na resolução
    // original e depois nas matrizes diagnósticas (3072 px e 2560 px).
    for (const targetSide of DIAGNOSTIC_PNG_LOSSLESS_SIDES) {
      const longestSide = Math.max(decoded.width, decoded.height);
      if (targetSide !== Infinity && longestSide <= targetSide) continue;

      const encoded = await decoded.encode({
        mimeType: 'image/png',
        maxSide: targetSide,
      });

      if (encoded.bytes.byteLength < smallestAttempt) {
        smallestAttempt = encoded.bytes.byteLength;
      }

      if (
        encoded.bytes.byteLength <= MAX_BLOB_UPLOAD_BYTES &&
        encoded.bytes.byteLength < originalSize
      ) {
        const resultFile = buildFile(
          encoded.bytes,
          originalFile.name,
          'image/png',
          originalFile.lastModified,
        );
        return {
          status: 'ok',
          file: resultFile,
          wasCompressed: true,
          originalSize,
          finalSize: resultFile.size,
          strategy: 'png-lossless',
        };
      }
    }

    // 2. Se a imagem possui transparência real, não convertemos para JPEG
    // para não alterar regiões transparentes do exame.
    if (!decoded.hasAlphaTransparency) {
      for (const step of DIAGNOSTIC_PNG_FALLBACK_JPEG_STEPS) {
        const encoded = await decoded.encode({
          mimeType: 'image/jpeg',
          maxSide: step.maxSide,
          quality: step.quality,
        });

        if (encoded.bytes.byteLength < smallestAttempt) {
          smallestAttempt = encoded.bytes.byteLength;
        }

        if (
          encoded.bytes.byteLength <= MAX_BLOB_UPLOAD_BYTES &&
          encoded.bytes.byteLength < originalSize
        ) {
          const newName = replaceExtension(originalFile.name, '.jpg');
          const resultFile = buildFile(
            encoded.bytes,
            newName,
            'image/jpeg',
            originalFile.lastModified,
          );
          return {
            status: 'ok',
            file: resultFile,
            wasCompressed: true,
            originalSize,
            finalSize: resultFile.size,
            strategy: 'png-diagnostic-jpeg',
          };
        }
      }
    }
  } finally {
    decoded.close();
  }

  return buildExceedsLimitError(originalSize, smallestAttempt);
}

async function compressDiagnosticJpeg(
  originalFile: File,
  bytes: Uint8Array,
  runtime: CompressionRuntime,
): Promise<CompressionResult> {
  const originalSize = originalFile.size;
  let decoded: DecodedRasterImage;
  try {
    decoded = await runtime.decodeImage(bytes, 'image/jpeg');
  } catch {
    return {
      status: 'error',
      reason: 'corrupted-file',
      error: 'Não foi possível abrir esta imagem JPG. Verifique se o arquivo está íntegro.',
      originalSize,
    };
  }

  let smallestAttempt = originalSize;
  try {
    for (const step of DIAGNOSTIC_IMAGE_STEPS) {
      const encoded = await decoded.encode({
        mimeType: 'image/jpeg',
        maxSide: step.maxSide,
        quality: step.quality,
      });

      if (encoded.bytes.byteLength < smallestAttempt) {
        smallestAttempt = encoded.bytes.byteLength;
      }

      if (
        encoded.bytes.byteLength <= MAX_BLOB_UPLOAD_BYTES &&
        encoded.bytes.byteLength < originalSize
      ) {
        const resultFile = buildFile(
          encoded.bytes,
          originalFile.name,
          'image/jpeg',
          originalFile.lastModified,
        );
        return {
          status: 'ok',
          file: resultFile,
          wasCompressed: true,
          originalSize,
          finalSize: resultFile.size,
          strategy: 'jpeg-diagnostic',
        };
      }
    }
  } finally {
    decoded.close();
  }

  return buildExceedsLimitError(originalSize, smallestAttempt);
}

/**
 * Otimiza PDFs de exames > 4,5 MB preservando textos, vetores, carimbos e metadados:
 * 1. Valida a integridade estrutural (%PDF-, %%EOF, ausência de criptografia).
 * 2. Tenta compressão estrutural sem perda (lossless Deflate em streams abertos + corte pós-EOF).
 * 3. Otimiza apenas os XObjects de imagem embutidos (/Subtype /Image com /DCTDecode)
 *    nos patamares de fidelidade diagnóstica, atualizando /Width, /Height, /ColorSpace,
 *    /Length e reconstruindo a tabela xref sem tocar nos textos ou vetores do laudo.
 */
async function compressDiagnosticPdf(
  originalFile: File,
  bytes: Uint8Array,
  runtime: CompressionRuntime,
): Promise<CompressionResult> {
  const originalSize = originalFile.size;
  const pdfText = decodeLatin1(bytes);

  const eofIndex = pdfText.lastIndexOf('%%EOF');
  if (eofIndex === -1) {
    return {
      status: 'error',
      reason: 'corrupted-file',
      error: 'O arquivo PDF está incompleto ou corrompido (marcador %%EOF ausente).',
      originalSize,
    };
  }

  // PDFs protegidos por senha/criptografia não podem ter streams reprocessados sem chave.
  if (/\/Encrypt\b/.test(pdfText)) {
    return buildExceedsLimitError(originalSize, originalSize);
  }

  let smallestAttempt = originalSize;
  const deflateFn = runtime.deflate ?? defaultDeflate;

  // Etapa 1: Compressão lossless de streams não comprimidos e remoção de sobras após %%EOF.
  const losslessBytes = await optimizePdfStructureLossless(bytes, pdfText, deflateFn);
  if (losslessBytes) {
    if (losslessBytes.byteLength < smallestAttempt) {
      smallestAttempt = losslessBytes.byteLength;
    }
    if (
      losslessBytes.byteLength <= MAX_BLOB_UPLOAD_BYTES &&
      losslessBytes.byteLength < originalSize
    ) {
      const resultFile = buildFile(
        losslessBytes,
        originalFile.name,
        'application/pdf',
        originalFile.lastModified,
      );
      return {
        status: 'ok',
        file: resultFile,
        wasCompressed: true,
        originalSize,
        finalSize: resultFile.size,
        strategy: 'pdf-lossless',
      };
    }
  }

  // Etapa 2: Otimização diagnóstica de imagens JPEG (/DCTDecode) embutidas no PDF.
  for (const step of DIAGNOSTIC_IMAGE_STEPS) {
    const optimizedBytes = await optimizePdfEmbeddedImages(
      bytes,
      pdfText,
      step,
      runtime,
    );
    if (!optimizedBytes) continue;

    if (optimizedBytes.byteLength < smallestAttempt) {
      smallestAttempt = optimizedBytes.byteLength;
    }

    if (
      optimizedBytes.byteLength <= MAX_BLOB_UPLOAD_BYTES &&
      optimizedBytes.byteLength < originalSize
    ) {
      const resultFile = buildFile(
        optimizedBytes,
        originalFile.name,
        'application/pdf',
        originalFile.lastModified,
      );
      return {
        status: 'ok',
        file: resultFile,
        wasCompressed: true,
        originalSize,
        finalSize: resultFile.size,
        strategy: 'pdf-diagnostic-images',
      };
    }
  }

  return buildExceedsLimitError(originalSize, smallestAttempt);
}

interface ParsedPdfObject {
  objNum: number;
  genNum: number;
  startOffset: number;
  endOffset: number;
  dictText: string;
  streamStart: number | null;
  streamEnd: number | null;
}

function parseClassicPdfObjects(
  bytes: Uint8Array,
  pdfText: string,
): {
  objects: ParsedPdfObject[];
  rootRef: string;
  infoRef: string | null;
} | null {
  // Se o PDF usa stream de referência cruzada comprimido (/Type /XRef) ou
  // streams de objetos (/Type /ObjStm), exigimos trailer clássico ou /Root explícito.
  if (/\/Type\s*\/ObjStm\b/.test(pdfText)) {
    return null;
  }

  const rootMatch = pdfText.match(/\/Root\s+(\d+\s+\d+\s+R)/);
  if (!rootMatch) return null;
  const infoMatch = pdfText.match(/\/Info\s+(\d+\s+\d+\s+R)/);

  const objects: ParsedPdfObject[] = [];
  const objRegex = /(?:^|[\r\n\s])(\d+)\s+(\d+)\s+obj\b/g;
  let match: RegExpExecArray | null;

  while ((match = objRegex.exec(pdfText)) !== null) {
    const leadOffset = match[0].search(/\d/);
    const startOffset = match.index + leadOffset;
    const objNum = Number(match[1]);
    const genNum = Number(match[2]);
    const bodyStart = match.index + match[0].length;

    const endObjPos = pdfText.indexOf('endobj', bodyStart);
    if (endObjPos === -1) return null;
    const endOffset = endObjPos + 'endobj'.length;

    const objectSliceText = pdfText.slice(bodyStart, endObjPos);
    const streamKeywordPos = findTopLevelStreamKeyword(objectSliceText);

    if (streamKeywordPos === -1) {
      objects.push({
        objNum,
        genNum,
        startOffset,
        endOffset,
        dictText: objectSliceText.trim(),
        streamStart: null,
        streamEnd: null,
      });
      objRegex.lastIndex = endOffset;
      continue;
    }

    const dictText = objectSliceText.slice(0, streamKeywordPos).trim();
    let dataStart = bodyStart + streamKeywordPos + 'stream'.length;
    if (bytes[dataStart] === 0x0d && bytes[dataStart + 1] === 0x0a) {
      dataStart += 2;
    } else if (bytes[dataStart] === 0x0a || bytes[dataStart] === 0x0d) {
      dataStart += 1;
    }

    const endStreamRel = objectSliceText.lastIndexOf('endstream');
    if (endStreamRel === -1) return null;
    let dataEnd = bodyStart + endStreamRel;
    if (bytes[dataEnd - 2] === 0x0d && bytes[dataEnd - 1] === 0x0a) {
      dataEnd -= 2;
    } else if (bytes[dataEnd - 1] === 0x0a || bytes[dataEnd - 1] === 0x0d) {
      dataEnd -= 1;
    }

    if (dataEnd < dataStart) return null;

    objects.push({
      objNum,
      genNum,
      startOffset,
      endOffset,
      dictText,
      streamStart: dataStart,
      streamEnd: dataEnd,
    });
    objRegex.lastIndex = endOffset;
  }

  if (objects.length === 0) return null;
  return {
    objects,
    rootRef: rootMatch[1],
    infoRef: infoMatch ? infoMatch[1] : null,
  };
}

function findTopLevelStreamKeyword(text: string): number {
  const dictEnd = text.lastIndexOf('>>');
  if (dictEnd === -1) return -1;
  const afterDict = text.slice(dictEnd + 2);
  const match = afterDict.match(/^\s*stream(?:\r\n|\n|\r)/);
  if (!match) return -1;
  return dictEnd + 2 + afterDict.indexOf('stream');
}

async function optimizePdfStructureLossless(
  bytes: Uint8Array,
  pdfText: string,
  deflateFn: (input: Uint8Array) => Promise<Uint8Array>,
): Promise<Uint8Array | null> {
  const parsed = parseClassicPdfObjects(bytes, pdfText);
  if (!parsed) {
    // Mesmo sem reconstruir objetos, remove bytes supérfluos após %%EOF se houver.
    const eofPos = pdfText.lastIndexOf('%%EOF');
    const trimmedEnd = eofPos + '%%EOF'.length;
    if (trimmedEnd < bytes.byteLength) {
      return bytes.subarray(0, trimmedEnd);
    }
    return null;
  }

  let modified = false;
  const rebuiltObjects: {
    objNum: number;
    genNum: number;
    dictText: string;
    streamBytes: Uint8Array | null;
  }[] = [];

  for (const obj of parsed.objects) {
    if (/\/Type\s*\/XRef\b/.test(obj.dictText)) continue;

    if (obj.streamStart === null || obj.streamEnd === null) {
      rebuiltObjects.push({
        objNum: obj.objNum,
        genNum: obj.genNum,
        dictText: obj.dictText,
        streamBytes: null,
      });
      continue;
    }

    const rawStream = bytes.subarray(obj.streamStart, obj.streamEnd);
    const hasFilter = /\/Filter\b/.test(obj.dictText);

    if (!hasFilter && rawStream.byteLength > 512) {
      try {
        const compressed = await deflateFn(rawStream);
        if (compressed.byteLength + 32 < rawStream.byteLength) {
          const updatedDict = updateStreamDictLengthAndFilter(
            obj.dictText,
            compressed.byteLength,
            '/FlateDecode',
          );
          rebuiltObjects.push({
            objNum: obj.objNum,
            genNum: obj.genNum,
            dictText: updatedDict,
            streamBytes: compressed,
          });
          modified = true;
          continue;
        }
      } catch {
        // Se a API de compressão não estiver disponível, preserva o stream original.
      }
    }

    rebuiltObjects.push({
      objNum: obj.objNum,
      genNum: obj.genNum,
      dictText: obj.dictText,
      streamBytes: rawStream,
    });
  }

  if (!modified) {
    const eofPos = pdfText.lastIndexOf('%%EOF');
    const trimmedEnd = eofPos + '%%EOF'.length;
    if (trimmedEnd < bytes.byteLength) {
      return bytes.subarray(0, trimmedEnd);
    }
    return null;
  }

  return serializePdfDocument(rebuiltObjects, parsed.rootRef, parsed.infoRef);
}

async function optimizePdfEmbeddedImages(
  bytes: Uint8Array,
  pdfText: string,
  step: { maxSide: number; quality: number },
  runtime: CompressionRuntime,
): Promise<Uint8Array | null> {
  const parsed = parseClassicPdfObjects(bytes, pdfText);
  if (!parsed) return null;

  let anyImageOptimized = false;
  const rebuiltObjects: {
    objNum: number;
    genNum: number;
    dictText: string;
    streamBytes: Uint8Array | null;
  }[] = [];

  for (const obj of parsed.objects) {
    if (/\/Type\s*\/XRef\b/.test(obj.dictText)) continue;

    if (obj.streamStart === null || obj.streamEnd === null) {
      rebuiltObjects.push({
        objNum: obj.objNum,
        genNum: obj.genNum,
        dictText: obj.dictText,
        streamBytes: null,
      });
      continue;
    }

    const rawStream = bytes.subarray(obj.streamStart, obj.streamEnd);
    const isImageSubtype = /\/Subtype\s*\/Image\b/.test(obj.dictText);
    const isDctDecode =
      /\/Filter\s*\/DCTDecode\b/.test(obj.dictText) ||
      /\/Filter\s*\[\s*\/DCTDecode\s*\]/.test(obj.dictText);
    const hasSoftMask = /\/SMask\b/.test(obj.dictText) || /\/Mask\b/.test(obj.dictText);
    const isSupportedColorSpace =
      /\/ColorSpace\s*\/(?:DeviceRGB|DeviceGray)\b/.test(obj.dictText);

    if (
      isImageSubtype &&
      isDctDecode &&
      !hasSoftMask &&
      isSupportedColorSpace &&
      rawStream.byteLength >= MIN_PDF_IMAGE_STREAM_BYTES
    ) {
      try {
        const decoded = await runtime.decodeImage(rawStream, 'image/jpeg');
        try {
          const encoded = await decoded.encode({
            mimeType: 'image/jpeg',
            maxSide: step.maxSide,
            quality: step.quality,
          });

          if (encoded.bytes.byteLength < rawStream.byteLength) {
            const updatedDict = updateImageObjectDict(obj.dictText, {
              width: encoded.width,
              height: encoded.height,
              length: encoded.bytes.byteLength,
            });
            rebuiltObjects.push({
              objNum: obj.objNum,
              genNum: obj.genNum,
              dictText: updatedDict,
              streamBytes: encoded.bytes,
            });
            anyImageOptimized = true;
            continue;
          }
        } finally {
          decoded.close();
        }
      } catch {
        // Se uma imagem embutida usar codificação específica não suportada pelo Canvas,
        // preserva o stream original intacto sem corromper o PDF.
      }
    }

    rebuiltObjects.push({
      objNum: obj.objNum,
      genNum: obj.genNum,
      dictText: obj.dictText,
      streamBytes: rawStream,
    });
  }

  if (!anyImageOptimized) return null;
  return serializePdfDocument(rebuiltObjects, parsed.rootRef, parsed.infoRef);
}

function updateStreamDictLengthAndFilter(
  dictText: string,
  newLength: number,
  filterName: string,
): string {
  let updated = dictText.replace(/\/Length\s+\d+/, `/Length ${newLength}`);
  if (!/\/Length\b/.test(updated)) {
    updated = updated.replace(/>>\s*$/, ` /Length ${newLength} >>`);
  }
  if (!/\/Filter\b/.test(updated)) {
    updated = updated.replace(/>>\s*$/, ` /Filter ${filterName} >>`);
  }
  return updated;
}

function updateImageObjectDict(
  dictText: string,
  params: { width: number; height: number; length: number },
): string {
  let updated = dictText
    .replace(/\/Width\s+\d+/, `/Width ${params.width}`)
    .replace(/\/Height\s+\d+/, `/Height ${params.height}`)
    .replace(/\/Length\s+\d+/, `/Length ${params.length}`)
    // O JPEG gerado pelo Canvas é sempre RGB 8-bit (3 componentes).
    .replace(/\/ColorSpace\s*\/DeviceGray\b/, '/ColorSpace /DeviceRGB');

  if (!/\/Length\b/.test(updated)) {
    updated = updated.replace(/>>\s*$/, ` /Length ${params.length} >>`);
  }
  return updated;
}

function serializePdfDocument(
  objects: {
    objNum: number;
    genNum: number;
    dictText: string;
    streamBytes: Uint8Array | null;
  }[],
  rootRef: string,
  infoRef: string | null,
): Uint8Array {
  const chunks: Uint8Array[] = [];
  let offset = 0;

  const pushText = (text: string) => {
    const encoded = encodeLatin1(text);
    chunks.push(encoded);
    offset += encoded.byteLength;
  };

  const pushBytes = (data: Uint8Array) => {
    chunks.push(data);
    offset += data.byteLength;
  };

  // Cabeçalho PDF 1.7 com marcador binário padrão de 4 bytes (> 128).
  pushText('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');

  const maxObjNum = objects.reduce((max, item) => Math.max(max, item.objNum), 0);
  const offsets = new Map<number, { offset: number; genNum: number }>();

  for (const obj of objects) {
    offsets.set(obj.objNum, { offset, genNum: obj.genNum });
    pushText(`${obj.objNum} ${obj.genNum} obj\n${obj.dictText}\n`);
    if (obj.streamBytes !== null) {
      pushText('stream\n');
      pushBytes(obj.streamBytes);
      pushText('\nendstream\n');
    }
    pushText('endobj\n');
  }

  const xrefOffset = offset;
  const totalEntries = maxObjNum + 1;
  pushText(`xref\n0 ${totalEntries}\n`);
  pushText('0000000000 65535 f \n');

  for (let i = 1; i < totalEntries; i++) {
    const entry = offsets.get(i);
    if (entry) {
      const paddedOffset = String(entry.offset).padStart(10, '0');
      const paddedGen = String(entry.genNum).padStart(5, '0');
      pushText(`${paddedOffset} ${paddedGen} n \n`);
    } else {
      pushText('0000000000 65535 f \n');
    }
  }

  const infoEntry = infoRef ? ` /Info ${infoRef}` : '';
  pushText(
    `trailer\n<< /Size ${totalEntries} /Root ${rootRef}${infoEntry} >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  const result = new Uint8Array(offset);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.byteLength;
  }
  return result;
}

function buildExceedsLimitError(
  originalSize: number,
  attemptedSize: number,
): CompressionResult {
  return {
    status: 'error',
    reason: 'exceeds-limit-after-compression',
    error: `Este exame tem ${formatFileSize(originalSize)} e não pôde ser reduzido para menos de 4,5 MB sem comprometer a nitidez diagnóstica (menor tamanho seguro: ${formatFileSize(attemptedSize)}). Divida o arquivo ou exporte apenas as páginas principais.`,
    originalSize,
    attemptedSize,
  };
}

function buildFile(
  bytes: Uint8Array,
  name: string,
  mimeType: AcceptedDocumentMimeType,
  lastModified: number,
): File {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy], name, {
    type: mimeType,
    lastModified,
  });
}

function replaceExtension(name: string, newExt: string): string {
  return /\.\w+$/.test(name) ? name.replace(/\.\w+$/, newExt) : `${name}${newExt}`;
}

function decodeLatin1(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    parts.push(String.fromCharCode(...slice));
  }
  return parts.join('');
}

function encodeLatin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}

async function defaultDeflate(input: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('CompressionStream indisponível.');
  }
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  const stream = new Blob([copy]).stream().pipeThrough(new CompressionStream('deflate'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

interface BrowserBitmap {
  readonly width: number;
  readonly height: number;
  close(): void;
}

interface BrowserCanvasContext2D {
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: 'low' | 'medium' | 'high';
  fillStyle: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(image: BrowserBitmap, dx: number, dy: number, dw: number, dh: number): void;
  getImageData(sx: number, sy: number, sw: number, sh: number): { data: Uint8ClampedArray };
}

interface BrowserCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): BrowserCanvasContext2D | null;
  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void;
}

interface BrowserEnv {
  createImageBitmap?: (
    blob: Blob,
    options?: { imageOrientation?: 'from-image' | 'flipY' },
  ) => Promise<BrowserBitmap>;
  document?: {
    createElement(tagName: 'canvas'): BrowserCanvas;
  };
}

function getBrowserEnv(): BrowserEnv {
  return globalThis as unknown as BrowserEnv;
}

/**
 * Implementação padrão no navegador usando ImageBitmap + HTML5 Canvas.
 */
export const browserCompressionRuntime: CompressionRuntime = {
  async decodeImage(bytes: Uint8Array, mimeType: string): Promise<DecodedRasterImage> {
    const env = getBrowserEnv();
    if (!env.createImageBitmap || !env.document) {
      throw new Error('Ambiente de navegador indisponível para decodificação de imagem.');
    }
    const createCanvas = () => env.document!.createElement('canvas');

    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy], { type: mimeType });
    const bitmap = await env.createImageBitmap(blob, { imageOrientation: 'from-image' });

    const hasAlphaTransparency =
      mimeType === 'image/png' ? detectBitmapAlpha(bitmap, createCanvas) : false;

    return {
      width: bitmap.width,
      height: bitmap.height,
      hasAlphaTransparency,
      async encode({ mimeType: targetMime, maxSide, quality }) {
        const longest = Math.max(bitmap.width, bitmap.height);
        const scale =
          Number.isFinite(maxSide) && longest > maxSide ? maxSide / longest : 1;
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = createCanvas();
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D indisponível.');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (targetMime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(bitmap, 0, 0, width, height);

        const encodedBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, targetMime, quality),
        );
        if (!encodedBlob) {
          throw new Error('Falha ao codificar imagem no navegador.');
        }

        return {
          bytes: new Uint8Array(await encodedBlob.arrayBuffer()),
          width,
          height,
        };
      },
      close() {
        bitmap.close();
      },
    };
  },
  deflate: defaultDeflate,
};

function detectBitmapAlpha(
  bitmap: BrowserBitmap,
  createCanvas: () => BrowserCanvas,
): boolean {
  // Amostra em grade até 256x256 para identificar rapidamente se há pixels transparentes.
  const sampleW = Math.min(bitmap.width, 256);
  const sampleH = Math.min(bitmap.height, 256);
  const canvas = createCanvas();
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  ctx.drawImage(bitmap, 0, 0, sampleW, sampleH);
  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}
