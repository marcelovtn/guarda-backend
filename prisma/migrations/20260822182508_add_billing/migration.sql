-- AlterTable
ALTER TABLE "instructor" ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "stripe_product_id" TEXT;

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "stripe_subscription_id" TEXT;

-- CreateTable
CREATE TABLE "billing_profile" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "deleted_at" TIMESTAMPTZ(6),
    "user_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,

    CONSTRAINT "billing_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_profile_user_id_key" ON "billing_profile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_profile_stripe_customer_id_key" ON "billing_profile"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "billing_profile_deleted_at_idx" ON "billing_profile"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "instructor_stripe_product_id_key" ON "instructor"("stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripe_subscription_id_key" ON "subscription"("stripe_subscription_id");

-- AddForeignKey
ALTER TABLE "billing_profile" ADD CONSTRAINT "billing_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

