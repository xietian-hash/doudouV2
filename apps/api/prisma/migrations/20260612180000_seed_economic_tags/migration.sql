UPDATE `tags`
SET `description` = CASE `name`
  WHEN '餐饮必要' THEN '早餐、午餐、晚餐、买菜、基础食品'
  WHEN '居住刚性' THEN '房租、物业、水电燃气、取暖费、基础维修'
  WHEN '债务还款' THEN '房贷、车贷、信用卡还款、消费贷、借款还款'
  WHEN '生活必要' THEN '通勤、基础通讯、医疗、教育、保险、赡养'
  WHEN '可选消费' THEN '娱乐、购物、旅游、奶茶咖啡、游戏、数码、非必要外卖'
  WHEN '转账投资' THEN '基金、股票、理财、储蓄转入、账户间转账'
  WHEN '不计入统计' THEN '报销冲账、退款、内部调整、无法判断'
  ELSE `description`
END,
    `tag_type` = 'economic',
    `can_edit` = 0,
    `can_delete` = 0
WHERE `is_deleted` = 0
  AND `name` IN ('餐饮必要', '居住刚性', '债务还款', '生活必要', '可选消费', '转账投资', '不计入统计');

INSERT INTO `tags` (`user_id`, `name`, `description`, `tag_type`, `can_edit`, `can_delete`, `is_deleted`, `created_at`, `updated_at`)
SELECT `u`.`id`, '餐饮必要', '早餐、午餐、晚餐、买菜、基础食品', 'economic', 0, 0, 0, NOW(), NOW()
FROM `users` `u`
WHERE `u`.`is_deleted` = 0
  AND NOT EXISTS (
    SELECT 1 FROM `tags` `t`
    WHERE `t`.`user_id` = `u`.`id` AND `t`.`name` = '餐饮必要' AND `t`.`is_deleted` = 0
  );

INSERT INTO `tags` (`user_id`, `name`, `description`, `tag_type`, `can_edit`, `can_delete`, `is_deleted`, `created_at`, `updated_at`)
SELECT `u`.`id`, '居住刚性', '房租、物业、水电燃气、取暖费、基础维修', 'economic', 0, 0, 0, NOW(), NOW()
FROM `users` `u`
WHERE `u`.`is_deleted` = 0
  AND NOT EXISTS (
    SELECT 1 FROM `tags` `t`
    WHERE `t`.`user_id` = `u`.`id` AND `t`.`name` = '居住刚性' AND `t`.`is_deleted` = 0
  );

INSERT INTO `tags` (`user_id`, `name`, `description`, `tag_type`, `can_edit`, `can_delete`, `is_deleted`, `created_at`, `updated_at`)
SELECT `u`.`id`, '债务还款', '房贷、车贷、信用卡还款、消费贷、借款还款', 'economic', 0, 0, 0, NOW(), NOW()
FROM `users` `u`
WHERE `u`.`is_deleted` = 0
  AND NOT EXISTS (
    SELECT 1 FROM `tags` `t`
    WHERE `t`.`user_id` = `u`.`id` AND `t`.`name` = '债务还款' AND `t`.`is_deleted` = 0
  );

INSERT INTO `tags` (`user_id`, `name`, `description`, `tag_type`, `can_edit`, `can_delete`, `is_deleted`, `created_at`, `updated_at`)
SELECT `u`.`id`, '生活必要', '通勤、基础通讯、医疗、教育、保险、赡养', 'economic', 0, 0, 0, NOW(), NOW()
FROM `users` `u`
WHERE `u`.`is_deleted` = 0
  AND NOT EXISTS (
    SELECT 1 FROM `tags` `t`
    WHERE `t`.`user_id` = `u`.`id` AND `t`.`name` = '生活必要' AND `t`.`is_deleted` = 0
  );

INSERT INTO `tags` (`user_id`, `name`, `description`, `tag_type`, `can_edit`, `can_delete`, `is_deleted`, `created_at`, `updated_at`)
SELECT `u`.`id`, '可选消费', '娱乐、购物、旅游、奶茶咖啡、游戏、数码、非必要外卖', 'economic', 0, 0, 0, NOW(), NOW()
FROM `users` `u`
WHERE `u`.`is_deleted` = 0
  AND NOT EXISTS (
    SELECT 1 FROM `tags` `t`
    WHERE `t`.`user_id` = `u`.`id` AND `t`.`name` = '可选消费' AND `t`.`is_deleted` = 0
  );

INSERT INTO `tags` (`user_id`, `name`, `description`, `tag_type`, `can_edit`, `can_delete`, `is_deleted`, `created_at`, `updated_at`)
SELECT `u`.`id`, '转账投资', '基金、股票、理财、储蓄转入、账户间转账', 'economic', 0, 0, 0, NOW(), NOW()
FROM `users` `u`
WHERE `u`.`is_deleted` = 0
  AND NOT EXISTS (
    SELECT 1 FROM `tags` `t`
    WHERE `t`.`user_id` = `u`.`id` AND `t`.`name` = '转账投资' AND `t`.`is_deleted` = 0
  );

INSERT INTO `tags` (`user_id`, `name`, `description`, `tag_type`, `can_edit`, `can_delete`, `is_deleted`, `created_at`, `updated_at`)
SELECT `u`.`id`, '不计入统计', '报销冲账、退款、内部调整、无法判断', 'economic', 0, 0, 0, NOW(), NOW()
FROM `users` `u`
WHERE `u`.`is_deleted` = 0
  AND NOT EXISTS (
    SELECT 1 FROM `tags` `t`
    WHERE `t`.`user_id` = `u`.`id` AND `t`.`name` = '不计入统计' AND `t`.`is_deleted` = 0
  );
