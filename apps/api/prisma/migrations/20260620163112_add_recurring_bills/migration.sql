-- AlterTable
ALTER TABLE `bills` ADD COLUMN `recurring_bill_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `ledgers` ALTER COLUMN `updated_at` DROP DEFAULT;

-- CreateTable
CREATE TABLE `recurring_bills` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `ledger_id` BIGINT NOT NULL,
    `account_id` BIGINT NOT NULL,
    `category_id` BIGINT NOT NULL,
    `type` TINYINT NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `remark` VARCHAR(255) NULL,
    `repeat_type` TINYINT NOT NULL,
    `repeat_day` TINYINT NULL,
    `repeat_month` TINYINT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `last_generated_date` DATE NULL,
    `is_active` TINYINT NOT NULL DEFAULT 1,
    `is_deleted` TINYINT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `recurring_bills_user_id_idx`(`user_id`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bills_recurring_bill_id_idx` ON `bills`(`recurring_bill_id`);

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_recurring_bill_id_fkey` FOREIGN KEY (`recurring_bill_id`) REFERENCES `recurring_bills`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_bills` ADD CONSTRAINT `recurring_bills_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_bills` ADD CONSTRAINT `recurring_bills_ledger_id_fkey` FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_bills` ADD CONSTRAINT `recurring_bills_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_bills` ADD CONSTRAINT `recurring_bills_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
