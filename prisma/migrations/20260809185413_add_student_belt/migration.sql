-- CreateEnum
CREATE TYPE "belt" AS ENUM ('WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK');

-- AlterTable
ALTER TABLE "user_info" ADD COLUMN     "belt" "belt";
