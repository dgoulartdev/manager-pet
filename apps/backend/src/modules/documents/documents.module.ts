import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DOCUMENT_STORAGE, DocumentStorage } from './storage/document-storage';
import { LocalDiskDocumentStorage } from './storage/local-disk-document-storage';
import { VercelBlobDocumentStorage } from './storage/vercel-blob-document-storage';

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      provide: DOCUMENT_STORAGE,
      inject: [ConfigService],
      // Exames usam uma store dedicada do Vercel Blob (prefixo DOCUMENTS_BLOB_*),
      // separada da store de fotos de perfil dos pacientes. Sem a variável,
      // grava no disco local em uploads/documents/.
      useFactory: (config: ConfigService): DocumentStorage => {
        const token = config.get<string>('DOCUMENTS_BLOB_READ_WRITE_TOKEN');
        const storeId = config.get<string>('DOCUMENTS_BLOB_STORE_ID');
        return token || storeId
          ? new VercelBlobDocumentStorage({ token, storeId })
          : new LocalDiskDocumentStorage(config);
      },
    },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
