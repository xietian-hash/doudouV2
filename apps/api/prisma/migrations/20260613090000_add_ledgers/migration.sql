CREATE TABLE `ledgers` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `scene_type` VARCHAR(20) NOT NULL DEFAULT 'personal',
  `is_default` TINYINT NOT NULL DEFAULT 0,
  `is_deleted` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ledgers_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ledgers`
  ADD CONSTRAINT `ledgers_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `ledgers` (`user_id`, `name`, `scene_type`, `is_default`, `is_deleted`, `created_at`, `updated_at`)
SELECT `id`, '日常账本', 'personal', 1, 0, NOW(), NOW()
FROM `users`;

ALTER TABLE `accounts` ADD COLUMN `ledger_id` BIGINT NULL AFTER `user_id`;
ALTER TABLE `categories` ADD COLUMN `ledger_id` BIGINT NULL AFTER `user_id`;
ALTER TABLE `tags` ADD COLUMN `ledger_id` BIGINT NULL AFTER `user_id`;
ALTER TABLE `bills` ADD COLUMN `ledger_id` BIGINT NULL AFTER `user_id`;

UPDATE `accounts` `a`
JOIN `ledgers` `l` ON `l`.`user_id` = `a`.`user_id` AND `l`.`is_default` = 1 AND `l`.`is_deleted` = 0
SET `a`.`ledger_id` = `l`.`id`
WHERE `a`.`ledger_id` IS NULL;

UPDATE `categories` `c`
JOIN `ledgers` `l` ON `l`.`user_id` = `c`.`user_id` AND `l`.`is_default` = 1 AND `l`.`is_deleted` = 0
SET `c`.`ledger_id` = `l`.`id`
WHERE `c`.`ledger_id` IS NULL;

UPDATE `tags` `t`
JOIN `ledgers` `l` ON `l`.`user_id` = `t`.`user_id` AND `l`.`is_default` = 1 AND `l`.`is_deleted` = 0
SET `t`.`ledger_id` = `l`.`id`
WHERE `t`.`ledger_id` IS NULL;

UPDATE `bills` `b`
JOIN `ledgers` `l` ON `l`.`user_id` = `b`.`user_id` AND `l`.`is_default` = 1 AND `l`.`is_deleted` = 0
SET `b`.`ledger_id` = `l`.`id`
WHERE `b`.`ledger_id` IS NULL;

ALTER TABLE `accounts` MODIFY `ledger_id` BIGINT NOT NULL;
ALTER TABLE `categories` MODIFY `ledger_id` BIGINT NOT NULL;
ALTER TABLE `tags` MODIFY `ledger_id` BIGINT NOT NULL;
ALTER TABLE `bills` MODIFY `ledger_id` BIGINT NOT NULL;

CREATE INDEX `accounts_ledger_id_idx` ON `accounts`(`ledger_id`);
CREATE INDEX `categories_ledger_id_idx` ON `categories`(`ledger_id`);
CREATE INDEX `tags_ledger_id_idx` ON `tags`(`ledger_id`);
CREATE INDEX `bills_ledger_id_idx` ON `bills`(`ledger_id`);

ALTER TABLE `accounts`
  ADD CONSTRAINT `accounts_ledger_id_fkey`
  FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ledger_id_fkey`
  FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `tags`
  ADD CONSTRAINT `tags_ledger_id_fkey`
  FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `bills`
  ADD CONSTRAINT `bills_ledger_id_fkey`
  FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
