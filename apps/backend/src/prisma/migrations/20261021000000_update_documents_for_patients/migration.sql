-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_appointment_id_fkey";

-- AlterTable
ALTER TABLE "documents"
ADD COLUMN "patient_id" TEXT NOT NULL,
ADD COLUMN "exam_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN "mime_type" TEXT NOT NULL,
ADD COLUMN "size_bytes" INTEGER NOT NULL,
ADD COLUMN "notes" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "appointment_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "documents_patient_id_idx" ON "documents"("patient_id");

-- CreateIndex
CREATE INDEX "documents_exam_date_idx" ON "documents"("exam_date");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
