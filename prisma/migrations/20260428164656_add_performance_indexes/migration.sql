-- CreateIndex
CREATE INDEX "attendance_sessions_classId_date_idx" ON "attendance_sessions"("classId", "date");

-- CreateIndex
CREATE INDEX "attendance_sessions_createdById_createdAt_idx" ON "attendance_sessions"("createdById", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "attendance_sessions_date_idx" ON "attendance_sessions"("date");

-- CreateIndex
CREATE INDEX "attendance_sessions_status_qrExpiresAt_idx" ON "attendance_sessions"("status", "qrExpiresAt");

-- CreateIndex
CREATE INDEX "attendances_studentId_checkInAt_idx" ON "attendances"("studentId", "checkInAt" DESC);

-- CreateIndex
CREATE INDEX "attendances_checkInAt_idx" ON "attendances"("checkInAt");

-- CreateIndex
CREATE INDEX "classes_teacherId_isActive_idx" ON "classes"("teacherId", "isActive");

-- CreateIndex
CREATE INDEX "students_classId_status_idx" ON "students"("classId", "status");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");
