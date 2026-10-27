import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Document } from '@prisma/client';
import { MAX_BLOB_UPLOAD_BYTES } from '@meupaciente/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentStorage, UploadedDocumentFile } from './storage/document-storage';

function buildDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc-1',
    user_id: 'user-1',
    patient_id: 'patient-1',
    appointment_id: null,
    name: 'Hemograma completo',
    type: 'exame_sangue',
    exam_date: new Date('2026-10-20T00:00:00.000Z'),
    mime_type: 'application/pdf',
    size_bytes: 65536,
    url: 'http://localhost:3000/uploads/documents/doc-1.pdf',
    notes: null,
    created_at: new Date('2026-10-20T00:00:00.000Z'),
    updated_at: new Date('2026-10-20T00:00:00.000Z'),
    ...overrides,
  } as Document;
}

const validPdfFile: UploadedDocumentFile = {
  buffer: Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'),
  mimetype: 'application/pdf',
  originalname: 'hemograma.pdf',
};

const validPngFile: UploadedDocumentFile = {
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]),
  mimetype: 'image/png',
  originalname: 'raio-x.png',
};

const validJpegFile: UploadedDocumentFile = {
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]),
  mimetype: 'image/jpeg',
  originalname: 'ultrassom.jpg',
};

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: {
    document: Record<string, jest.Mock>;
    patient: Record<string, jest.Mock>;
    appointment: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let storage: jest.Mocked<DocumentStorage>;

  beforeEach(() => {
    prisma = {
      document: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      patient: { findFirst: jest.fn() },
      appointment: { findFirst: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    storage = {
      save: jest.fn().mockResolvedValue('https://blob.vercel-storage.com/documents/doc-1.pdf'),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    service = new DocumentsService(
      prisma as unknown as PrismaService,
      storage,
    );
  });

  const baseDto: CreateDocumentDto = {
    patient_id: 'patient-1',
    name: 'Hemograma completo',
    type: 'exame_sangue',
    exam_date: '2026-10-20',
  };

  describe('create', () => {
    it('salva o arquivo no storage e registra o documento para PDF, PNG e JPEG válidos', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.document.create.mockResolvedValue(buildDocument());

      for (const file of [validPdfFile, validPngFile, validJpegFile]) {
        const result = await service.create('user-1', baseDto, file);
        expect(result.name).toBe('Hemograma completo');
      }

      expect(storage.save).toHaveBeenCalledTimes(3);
      expect(prisma.document.create).toHaveBeenCalledTimes(3);
    });

    it('rejeita envio sem arquivo ou com buffer vazio sem acionar o storage', async () => {
      await expect(service.create('user-1', baseDto, undefined)).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(
        service.create('user-1', baseDto, {
          buffer: Buffer.alloc(0),
          mimetype: 'application/pdf',
          originalname: 'vazio.pdf',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('rejeita arquivo que excede 4,5 MB sem enviar ao Blob', async () => {
      const oversized = Buffer.alloc(MAX_BLOB_UPLOAD_BYTES + 1, 0x20);
      oversized.write('%PDF-1.7\n', 0, 'latin1');

      await expect(
        service.create('user-1', baseDto, {
          buffer: oversized,
          mimetype: 'application/pdf',
          originalname: 'exame-7mb.pdf',
        }),
      ).rejects.toThrow('O arquivo excede o limite de 4,5 MB permitido para envio.');

      expect(storage.save).not.toHaveBeenCalled();
    });

    it('rejeita formato não suportado ou assinatura binária inválida (magic bytes)', async () => {
      await expect(
        service.create('user-1', baseDto, {
          buffer: Buffer.from('conteudo falso'),
          mimetype: 'application/pdf',
          originalname: 'falso.pdf',
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      await expect(
        service.create('user-1', baseDto, {
          buffer: Buffer.from('nao e png'),
          mimetype: 'image/png',
          originalname: 'falso.png',
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(storage.save).not.toHaveBeenCalled();
    });

    it('remove o arquivo do storage se a gravação no banco falhar', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.document.create.mockRejectedValue(new Error('Falha no banco'));

      await expect(service.create('user-1', baseDto, validPdfFile)).rejects.toThrow(
        'Falha no banco',
      );

      expect(storage.remove).toHaveBeenCalledWith(
        'https://blob.vercel-storage.com/documents/doc-1.pdf',
      );
    });

    it('valida ownership do paciente e vínculo do atendimento ao mesmo paciente', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.create('user-1', baseDto, validPdfFile)).rejects.toThrow(
        NotFoundException,
      );

      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.appointment.findFirst.mockResolvedValue({
        id: 'appt-outro',
        patient_id: 'patient-2',
      });

      await expect(
        service.create(
          'user-1',
          { ...baseDto, appointment_id: 'appt-outro' },
          validPdfFile,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(storage.save).not.toHaveBeenCalled();
    });
  });

  describe('remove e removeAllForPatient', () => {
    it('remove o arquivo do storage antes de apagar o registro no banco', async () => {
      prisma.document.findFirst.mockResolvedValue(
        buildDocument({ url: 'https://blob.vercel-storage.com/documents/doc-1.pdf' }),
      );
      prisma.document.delete.mockResolvedValue({});

      await service.remove('user-1', 'doc-1');

      expect(storage.remove).toHaveBeenCalledWith(
        'https://blob.vercel-storage.com/documents/doc-1.pdf',
      );
      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });

    it('apaga todos os arquivos de exames de um paciente ao excluí-lo', async () => {
      prisma.document.findMany.mockResolvedValue([
        { url: 'https://blob.vercel-storage.com/documents/doc-1.pdf' },
        { url: 'https://blob.vercel-storage.com/documents/doc-2.jpg' },
      ]);

      await service.removeAllForPatient('user-1', 'patient-1');

      expect(storage.remove).toHaveBeenCalledTimes(2);
    });
  });
});
