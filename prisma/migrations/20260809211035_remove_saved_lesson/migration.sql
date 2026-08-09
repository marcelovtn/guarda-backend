/*
  Warnings:

  - You are about to drop the `saved_lesson` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "saved_lesson" DROP CONSTRAINT "saved_lesson_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "saved_lesson" DROP CONSTRAINT "saved_lesson_student_id_fkey";

-- DropTable
DROP TABLE "saved_lesson";
