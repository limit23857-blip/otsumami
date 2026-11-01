-- CreateEnum
CREATE TYPE "DrinkType" AS ENUM ('beer', 'sake', 'highball', 'wine', 'shochu', 'other');

-- CreateEnum
CREATE TYPE "RecipeSource" AS ENUM ('ai', 'manual');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "ingredients" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "cook_minutes" INTEGER NOT NULL,
    "drink_type" "DrinkType" NOT NULL,
    "source" "RecipeSource" NOT NULL DEFAULT 'manual',
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cook_logs" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "memo" TEXT,
    "cooked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "recipes_user_id_created_at_idx" ON "recipes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "cook_logs_user_id_cooked_at_idx" ON "cook_logs"("user_id", "cooked_at");

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cook_logs" ADD CONSTRAINT "cook_logs_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cook_logs" ADD CONSTRAINT "cook_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
