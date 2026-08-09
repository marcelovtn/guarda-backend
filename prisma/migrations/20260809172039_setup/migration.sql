-- CreateEnum
CREATE TYPE "track_category" AS ENUM ('GUARD', 'PASSING', 'CONTROL', 'SUBMISSIONS', 'ESCAPES', 'TAKEDOWNS');

-- CreateEnum
CREATE TYPE "track_level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "publish_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE');

-- CreateTable
CREATE TABLE "instructor" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" TIMESTAMPTZ(6),
    "user_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "photo_key" TEXT,
    "monthly_price" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" TIMESTAMPTZ(6),
    "instructor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "track_category" NOT NULL,
    "level" "track_level" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" TIMESTAMPTZ(6),
    "track_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" TIMESTAMPTZ(6),
    "instructor_id" TEXT NOT NULL,
    "module_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "video_key" TEXT,
    "duration_sec" INTEGER NOT NULL DEFAULT 0,
    "status" "publish_status" NOT NULL DEFAULT 'DRAFT',
    "position" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" TIMESTAMPTZ(6),
    "student_id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "monthly_price" INTEGER NOT NULL,
    "renews_at" TIMESTAMPTZ(6),
    "canceled_at" TIMESTAMPTZ(6),

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "student_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "last_position_sec" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_lesson" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "student_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,

    CONSTRAINT "saved_lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instructor_user_id_key" ON "instructor"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "instructor_slug_key" ON "instructor"("slug");

-- CreateIndex
CREATE INDEX "instructor_deleted_at_idx" ON "instructor"("deleted_at");

-- CreateIndex
CREATE INDEX "track_instructor_id_category_idx" ON "track"("instructor_id", "category");

-- CreateIndex
CREATE INDEX "track_deleted_at_idx" ON "track"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "track_instructor_id_slug_key" ON "track"("instructor_id", "slug");

-- CreateIndex
CREATE INDEX "module_track_id_idx" ON "module"("track_id");

-- CreateIndex
CREATE INDEX "module_deleted_at_idx" ON "module"("deleted_at");

-- CreateIndex
CREATE INDEX "lesson_instructor_id_status_idx" ON "lesson"("instructor_id", "status");

-- CreateIndex
CREATE INDEX "lesson_module_id_position_idx" ON "lesson"("module_id", "position");

-- CreateIndex
CREATE INDEX "lesson_deleted_at_idx" ON "lesson"("deleted_at");

-- CreateIndex
CREATE INDEX "subscription_student_id_status_idx" ON "subscription"("student_id", "status");

-- CreateIndex
CREATE INDEX "subscription_deleted_at_idx" ON "subscription"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_student_id_instructor_id_key" ON "subscription"("student_id", "instructor_id");

-- CreateIndex
CREATE INDEX "lesson_progress_student_id_updated_at_idx" ON "lesson_progress"("student_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_student_id_lesson_id_key" ON "lesson_progress"("student_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_lesson_student_id_lesson_id_key" ON "saved_lesson"("student_id", "lesson_id");

-- AddForeignKey
ALTER TABLE "instructor" ADD CONSTRAINT "instructor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track" ADD CONSTRAINT "track_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_lesson" ADD CONSTRAINT "saved_lesson_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_lesson" ADD CONSTRAINT "saved_lesson_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
