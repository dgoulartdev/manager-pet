import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Appointment, Document, Patient, Prisma } from '@prisma/client';
import {
  ACCEPTED_DOCUMENT_MIME_TYPES,
  MAX_BLOB_UPLOAD_BYTES,
  type AcceptedDocumentMimeType,
  type DocumentDetailDto,
  type DocumentDto,
  type DocumentListItemDto,
  type PaginatedResponse,
} from '@meupaciente/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination';
import {
  toDocumentDetailDto,
  toDocumentDto,
  toDocumentListItemDto,
} from '../../common/mappers/document.mapper';
import { PATIENT_SUMMARY_SELECT } from '../../common/mappers/patient.mapper';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import {
  DOCUMENT_STORAGE,
  DocumentStorage,
  UploadedDocumentFile,
  verifyDocumentMagicBytes,
} from './storage/document-storage';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_STORAGE)
    private readonly documentStorage: DocumentStorage,
  ) {}

  async create(
    userId: string,
    dto: CreateDocumentDto,
    file: UploadedDocumentFile | undefined,
  ): Promise<DocumentDto> {
    this.validateUploadedFile(file);

    await this.getOwnedPatient(userId, dto.patient_id);
    if (dto.appointment_id) {
      await this.getOwnedAppointment(userId, dto.appointment_id, dto.patient_id);
    }

    const documentId = randomUUID();
    const url = await this.documentStorage.save(documentId, file);

    try {
      const document = await this.prisma.document.create({
        data: {
          id: documentId,
          user_id: userId,
          patient_id: dto.patient_id,
          appointment_id: dto.appointment_id ?? null,
          name: dto.name,
          type: dto.type ?? null,
          exam_date: new Date(dto.exam_date),
          mime_type: file.mimetype,
          size_bytes: file.buffer.length,
          url,
          notes: dto.notes ?? null,
        },
      });
      return toDocumentDto(document);
    } catch (error) {
      await this.documentStorage.remove(url);
      throw error;
    }
  }

  async findAll(
    userId: string,
    query: ListDocumentsQueryDto,
  ): Promise<PaginatedResponse<DocumentListItemDto>> {
    const { page, per_page, patient_id, appointment_id } = query;

    const where: Prisma.DocumentWhereInput = {
      user_id: userId,
      ...(patient_id ? { patient_id } : {}),
      ...(appointment_id ? { appointment_id } : {}),
    };

    const [documents, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        include: { patient: { select: PATIENT_SUMMARY_SELECT } },
        orderBy: [{ exam_date: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.prisma.document.count({ where }),
    ]);

    return paginate(documents.map(toDocumentListItemDto), total, page, per_page);
  }

  async findOne(userId: string, id: string): Promise<DocumentDetailDto> {
    const document = await this.getOwnedWithRelations(userId, id);
    return toDocumentDetailDto(document);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<DocumentDto> {
    const existing = await this.getOwned(userId, id);

    if (dto.appointment_id) {
      await this.getOwnedAppointment(userId, dto.appointment_id, existing.patient_id);
    }

    const data: Prisma.DocumentUncheckedUpdateInput = {};
    if (dto.appointment_id !== undefined) data.appointment_id = dto.appointment_id;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.exam_date !== undefined) data.exam_date = new Date(dto.exam_date);
    if (dto.notes !== undefined) data.notes = dto.notes;

    const document = await this.prisma.document.update({ where: { id }, data });
    return toDocumentDto(document);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.getOwned(userId, id);
    await this.documentStorage.remove(existing.url);
    await this.prisma.document.delete({ where: { id } });
  }

  async removeAllForPatient(userId: string, patientId: string): Promise<void> {
    const documents = await this.prisma.document.findMany({
      where: { user_id: userId, patient_id: patientId },
      select: { url: true },
    });
    await Promise.all(
      documents.map((document) => this.documentStorage.remove(document.url)),
    );
  }

  private validateUploadedFile(
    file: UploadedDocumentFile | undefined,
  ): asserts file is UploadedDocumentFile {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new UnprocessableEntityException(
        'Arquivo do exame é obrigatório (campo "file").',
      );
    }

    if (
      !ACCEPTED_DOCUMENT_MIME_TYPES.includes(
        file.mimetype as AcceptedDocumentMimeType,
      )
    ) {
      throw new UnprocessableEntityException(
        'Formato inválido. Envie um arquivo PDF, JPG ou PNG.',
      );
    }

    if (file.buffer.length > MAX_BLOB_UPLOAD_BYTES) {
      throw new UnprocessableEntityException(
        'O arquivo excede o limite de 4,5 MB permitido para envio.',
      );
    }

    if (!verifyDocumentMagicBytes(file.buffer, file.mimetype)) {
      throw new UnprocessableEntityException(
        'O conteúdo do arquivo está corrompido ou não corresponde ao formato informado.',
      );
    }
  }

  private async getOwned(userId: string, id: string): Promise<Document> {
    const document = await this.prisma.document.findFirst({
      where: { id, user_id: userId },
    });
    if (!document) {
      throw new NotFoundException('Documento não encontrado.');
    }
    return document;
  }

  private async getOwnedWithRelations(
    userId: string,
    id: string,
  ): Promise<Document & { patient: Patient }> {
    const document = await this.prisma.document.findFirst({
      where: { id, user_id: userId },
      include: { patient: true },
    });
    if (!document) {
      throw new NotFoundException('Documento não encontrado.');
    }
    return document;
  }

  private async getOwnedPatient(userId: string, patientId: string): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, user_id: userId },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }
    return patient;
  }

  private async getOwnedAppointment(
    userId: string,
    appointmentId: string,
    patientId: string,
  ): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, user_id: userId },
    });
    if (!appointment) {
      throw new NotFoundException('Atendimento não encontrado.');
    }
    if (appointment.patient_id !== patientId) {
      throw new UnprocessableEntityException(
        'appointment_id deve pertencer ao mesmo paciente do documento.',
      );
    }
    return appointment;
  }
}
