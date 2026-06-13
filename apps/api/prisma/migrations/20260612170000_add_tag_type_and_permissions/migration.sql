ALTER TABLE `tags`
  ADD COLUMN `tag_type` VARCHAR(20) NOT NULL DEFAULT 'user' AFTER `name`,
  ADD COLUMN `can_edit` TINYINT NOT NULL DEFAULT 1 AFTER `tag_type`,
  ADD COLUMN `can_delete` TINYINT NOT NULL DEFAULT 1 AFTER `can_edit`;

UPDATE `tags`
SET `tag_type` = 'user',
    `can_edit` = 1,
    `can_delete` = 1
WHERE `tag_type` IS NULL OR `tag_type` = '';
