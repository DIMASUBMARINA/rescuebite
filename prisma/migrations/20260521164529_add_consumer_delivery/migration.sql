/*
  Warnings:

  - A unique constraint covering the columns `[inventory_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_id]` on the table `pickups` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PickupType" AS ENUM ('SHELTER_DELIVERY', 'CONSUMER_DELIVERY');

-- DropForeignKey
ALTER TABLE "pickups" DROP CONSTRAINT "pickups_claim_id_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivery_address" TEXT,
ADD COLUMN     "delivery_fee" DECIMAL(10,2),
ADD COLUMN     "delivery_lat" DECIMAL(10,8),
ADD COLUMN     "delivery_lon" DECIMAL(11,8),
ADD COLUMN     "is_delivery" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pickups" ADD COLUMN     "order_id" TEXT,
ADD COLUMN     "type" "PickupType" NOT NULL DEFAULT 'SHELTER_DELIVERY',
ALTER COLUMN "claim_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_inventory_id_key" ON "orders"("inventory_id");

-- CreateIndex
CREATE UNIQUE INDEX "pickups_order_id_key" ON "pickups"("order_id");

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
