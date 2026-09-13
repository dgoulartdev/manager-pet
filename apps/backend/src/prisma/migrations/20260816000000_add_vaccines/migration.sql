-- CreateTable
CREATE TABLE "vaccines" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "batch" TEXT,
    "application_date" TIMESTAMP(3) NOT NULL,
    "next_dose_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vaccines_user_id_idx" ON "vaccines"("user_id");

-- CreateIndex
CREATE INDEX "vaccines_patient_id_idx" ON "vaccines"("patient_id");

-- CreateIndex
CREATE INDEX "vaccines_appointment_id_idx" ON "vaccines"("appointment_id");

-- CreateIndex
CREATE INDEX "vaccines_application_date_idx" ON "vaccines"("application_date");

-- AddForeignKey
ALTER TABLE "vaccines" ADD CONSTRAINT "vaccines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccines" ADD CONSTRAINT "vaccines_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccines" ADD CONSTRAINT "vaccines_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
