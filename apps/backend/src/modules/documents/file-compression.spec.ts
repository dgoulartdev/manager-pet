import { deflateSync } from 'node:zlib';
import {
  compressExamFileIfNeeded,
  detectExamFormat,
  formatFileSize,
  MAX_BLOB_UPLOAD_BYTES,
  type CompressionRuntime,
} from '../../../../frontend/src/lib/fileCompression';

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

function createSyntheticFile(
  header: Uint8Array,
  totalSize: number,
  name: string,
  type: string,
): File {
  const bytes = new Uint8Array(totalSize);
  bytes.set(header, 0);
  return new File([bytes], name, { type });
}

function buildSyntheticPdfWithEmbeddedJpeg(jpegPayloadSize: number): File {
  const jpegBytes = new Uint8Array(jpegPayloadSize);
  jpegBytes.set(JPEG_MAGIC, 0);
  for (let i = JPEG_MAGIC.length; i < jpegPayloadSize - 2; i++) {
    jpegBytes[i] = i & 0xff;
  }
  jpegBytes[jpegPayloadSize - 2] = 0xff;
  jpegBytes[jpegPayloadSize - 1] = 0xd9;

  const encoder = new TextEncoder();
  const part1 = encoder.encode(
    '%PDF-1.7\n' +
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> >>\nendobj\n' +
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width 4000 /Height 3000 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegPayloadSize} >>\nstream\n`,
  );
  const part2 = encoder.encode(
    '\nendstream\nendobj\n' +
      '5 0 obj\n<< /Title (Laudo Radiografico) /Author (Dra. Marina) >>\nendobj\n' +
      'xref\n0 6\n0000000000 65535 f \n' +
      'trailer\n<< /Size 6 /Root 1 0 R /Info 5 0 R >>\nstartxref\n100\n%%EOF',
  );

  const total = new Uint8Array(part1.byteLength + jpegBytes.byteLength + part2.byteLength);
  total.set(part1, 0);
  total.set(jpegBytes, part1.byteLength);
  total.set(part2, part1.byteLength + jpegBytes.byteLength);

  return new File([total], 'raio-x-torax-7mb.pdf', { type: 'application/pdf' });
}

describe('compressExamFileIfNeeded (compressão diagnóstica para Vercel Blob)', () => {
  it('mantém arquivos <= 4,5 MB intactos para PDF (65 KB e 1,3 MB), PNG e JPG', async () => {
    const pdfHeader = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
    const bloodExam65kb = createSyntheticFile(
      pdfHeader,
      65 * 1024,
      'hemograma.pdf',
      'application/pdf',
    );
    const imaging1_3mb = createSyntheticFile(
      pdfHeader,
      Math.round(1.3 * 1024 * 1024),
      'ultrassom.pdf',
      'application/pdf',
    );
    const pngSmall = createSyntheticFile(
      PNG_MAGIC,
      500 * 1024,
      'raio-x.png',
      'image/png',
    );
    const jpgSmall = createSyntheticFile(
      JPEG_MAGIC,
      800 * 1024,
      'ecocardiograma.jpg',
      'image/jpeg',
    );

    for (const file of [bloodExam65kb, imaging1_3mb, pngSmall, jpgSmall]) {
      const res = await compressExamFileIfNeeded(file);
      expect(res.status).toBe('ok');
      if (res.status === 'ok') {
        expect(res.wasCompressed).toBe(false);
        expect(res.strategy).toBe('original');
        expect(res.finalSize).toBe(file.size);
        expect(res.file.size).toBeLessThanOrEqual(MAX_BLOB_UPLOAD_BYTES);
      }
    }
  });

  it('otimiza PNG > 4,5 MB preservando formato PNG lossless quando cabe no limite', async () => {
    const png7mb = createSyntheticFile(
      PNG_MAGIC,
      7 * 1024 * 1024,
      'radiografia-7mb.png',
      'image/png',
    );

    const mockRuntime: CompressionRuntime = {
      async decodeImage() {
        return {
          width: 4096,
          height: 3072,
          hasAlphaTransparency: false,
          async encode({ mimeType, maxSide }) {
            // Na matriz 3072px em PNG sem perda, cai para 2,8 MB.
            const targetSize = maxSide === Infinity ? 5 * 1024 * 1024 : Math.round(2.8 * 1024 * 1024);
            const out = new Uint8Array(targetSize);
            out.set( mimeType === 'image/png' ? PNG_MAGIC : JPEG_MAGIC, 0);
            return { bytes: out, width: 3072, height: 2304 };
          },
          close() {},
        };
      },
    };

    const res = await compressExamFileIfNeeded(png7mb, mockRuntime);
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.wasCompressed).toBe(true);
      expect(res.strategy).toBe('png-lossless');
      expect(res.file.type).toBe('image/png');
      expect(res.finalSize).toBeLessThanOrEqual(MAX_BLOB_UPLOAD_BYTES);
    }
  });

  it('bloqueia PNG com transparência que continua > 4,5 MB sem convertê-lo para JPEG com perda', async () => {
    const pngTransparent7mb = createSyntheticFile(
      PNG_MAGIC,
      7 * 1024 * 1024,
      'exame-com-camada-alfa.png',
      'image/png',
    );

    const mockRuntime: CompressionRuntime = {
      async decodeImage() {
        return {
          width: 4000,
          height: 3000,
          hasAlphaTransparency: true,
          async encode() {
            const out = new Uint8Array(5.2 * 1024 * 1024);
            out.set(PNG_MAGIC, 0);
            return { bytes: out, width: 2560, height: 1920 };
          },
          close() {},
        };
      },
    };

    const res = await compressExamFileIfNeeded(pngTransparent7mb, mockRuntime);
    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.reason).toBe('exceeds-limit-after-compression');
      expect(res.error).toContain('4,5 MB');
      expect(res.error).toContain('nitidez diagnóstica');
    }
  });

  it('otimiza JPEG > 4,5 MB nos patamares diagnósticos (>= 2048px e qualidade >= 0,90)', async () => {
    const jpg7mb = createSyntheticFile(
      JPEG_MAGIC,
      7 * 1024 * 1024,
      'raio-x-coluna.jpg',
      'image/jpeg',
    );

    const triedSteps: { maxSide: number; quality?: number }[] = [];
    const mockRuntime: CompressionRuntime = {
      async decodeImage() {
        return {
          width: 4032,
          height: 3024,
          hasAlphaTransparency: false,
          async encode({ maxSide, quality }) {
            triedSteps.push({ maxSide, quality });
            const size =
              maxSide === 3072
                ? 4.8 * 1024 * 1024
                : Math.round(1.6 * 1024 * 1024);
            const out = new Uint8Array(size);
            out.set(JPEG_MAGIC, 0);
            return { bytes: out, width: 2560, height: 1920 };
          },
          close() {},
        };
      },
    };

    const res = await compressExamFileIfNeeded(jpg7mb, mockRuntime);
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.wasCompressed).toBe(true);
      expect(res.strategy).toBe('jpeg-diagnostic');
      expect(res.finalSize).toBeLessThanOrEqual(MAX_BLOB_UPLOAD_BYTES);
      expect(triedSteps[0]).toEqual({ maxSide: 3072, quality: 0.92 });
      expect(triedSteps[1]).toEqual({ maxSide: 2560, quality: 0.92 });
    }
  });

  it('interrompe o upload quando arquivo de 7 MB continua > 4,5 MB após os passos diagnósticos seguros', async () => {
    const jpg7mb = createSyntheticFile(
      JPEG_MAGIC,
      7 * 1024 * 1024,
      'exame-denso-7mb.jpg',
      'image/jpeg',
    );

    const mockRuntime: CompressionRuntime = {
      async decodeImage() {
        return {
          width: 4096,
          height: 4096,
          hasAlphaTransparency: false,
          async encode() {
            // Mesmo no menor passo seguro (2048px @ 0.90), fica com 4,9 MB (> 4,5 MB).
            const out = new Uint8Array(Math.round(4.9 * 1024 * 1024));
            out.set(JPEG_MAGIC, 0);
            return { bytes: out, width: 2048, height: 2048 };
          },
          close() {},
        };
      },
    };

    const res = await compressExamFileIfNeeded(jpg7mb, mockRuntime);
    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.reason).toBe('exceeds-limit-after-compression');
      expect(res.error).toContain('7,0 MB');
      expect(res.error).toContain('4,5 MB');
    }
  });

  it('otimiza PDF de 7 MB com imagem de raio-X embutida preservando textos, metadados e tabela xref', async () => {
    const pdf7mb = buildSyntheticPdfWithEmbeddedJpeg(7 * 1024 * 1024);
    expect(pdf7mb.size).toBeGreaterThan(MAX_BLOB_UPLOAD_BYTES);

    const mockRuntime: CompressionRuntime = {
      async decodeImage() {
        return {
          width: 4000,
          height: 3000,
          hasAlphaTransparency: false,
          async encode() {
            const compressedJpeg = new Uint8Array(Math.round(1.2 * 1024 * 1024));
            compressedJpeg.set(JPEG_MAGIC, 0);
            return { bytes: compressedJpeg, width: 3072, height: 2304 };
          },
          close() {},
        };
      },
      async deflate(data) {
        return new Uint8Array(deflateSync(data));
      },
    };

    const res = await compressExamFileIfNeeded(pdf7mb, mockRuntime);
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.wasCompressed).toBe(true);
      expect(res.strategy).toBe('pdf-diagnostic-images');
      expect(res.finalSize).toBeLessThanOrEqual(MAX_BLOB_UPLOAD_BYTES);

      const outputText = Buffer.from(await res.file.arrayBuffer()).toString('latin1');
      // Preserva metadados, estrutura de catálogo e atualiza atributos do XObject de imagem.
      expect(outputText.startsWith('%PDF-1.7')).toBe(true);
      expect(outputText.endsWith('%%EOF')).toBe(true);
      expect(outputText).toContain('/Title (Laudo Radiografico)');
      expect(outputText).toContain('/Width 3072');
      expect(outputText).toContain('/Height 2304');
      expect(outputText).toContain('/ColorSpace /DeviceRGB');
    }
  });

  it('rejeita formatos não suportados e arquivos com assinatura binária falsa ou corrompida', async () => {
    const fakePdf = new File([new TextEncoder().encode('ISTO NAO E UM PDF')], 'exame.pdf', {
      type: 'application/pdf',
    });
    const fakeRes = await compressExamFileIfNeeded(fakePdf);
    expect(fakeRes.status).toBe('error');
    if (fakeRes.status === 'error') {
      expect(fakeRes.reason).toBe('corrupted-file');
    }

    const docFile = new File([new Uint8Array([1, 2, 3, 4, 5])], 'laudo.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const unsupportedRes = await compressExamFileIfNeeded(docFile);
    expect(unsupportedRes.status).toBe('error');
    if (unsupportedRes.status === 'error') {
      expect(unsupportedRes.reason).toBe('unsupported-format');
    }

    expect(detectExamFormat(PNG_MAGIC, 'image/png', 'foto.png')).toBe('image/png');
    expect(formatFileSize(65 * 1024)).toBe('65 KB');
    expect(formatFileSize(7 * 1024 * 1024)).toBe('7,0 MB');
  });
});
