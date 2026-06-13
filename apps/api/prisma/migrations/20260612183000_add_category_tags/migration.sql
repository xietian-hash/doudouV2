CREATE TABLE `category_tags` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT NOT NULL,
  `tag_id` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `category_tags_category_id_tag_id_key`(`category_id`, `tag_id`),
  INDEX `category_tags_tag_id_idx`(`tag_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `category_tags`
  ADD CONSTRAINT `category_tags_category_id_fkey`
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `category_tags`
  ADD CONSTRAINT `category_tags_tag_id_fkey`
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
