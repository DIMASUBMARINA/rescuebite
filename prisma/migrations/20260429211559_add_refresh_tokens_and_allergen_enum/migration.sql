/*
  Warnings:

  - The `allergens` column on the `inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `allergen` on the `user_allergies` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Allergen" AS ENUM ('GLUTEN', 'DAIRY', 'EGGS', 'FISH', 'SHELLFISH', 'TREE_NUTS', 'PEANUTS', 'WHEAT', 'SOY', 'SESAME');

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "allergens",
ADD COLUMN     "allergens" "Allergen"[];

-- AlterTable
ALTER TABLE "user_allergies" DROP COLUMN "allergen",
ADD COLUMN     "allergen" "Allergen" NOT NULL;

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_allergies_user_id_allergen_key" ON "user_allergies"("user_id", "allergen");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
