-- 将 bills.bill_date 从 DATE 升级为 DATETIME(0)，支持精确到秒
ALTER TABLE `bills` MODIFY COLUMN `bill_date` DATETIME(0) NOT NULL;
