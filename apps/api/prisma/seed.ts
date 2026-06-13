import { PrismaClient } from '@prisma/client';

const ECONOMIC_TAGS = [
  {
    name: '餐饮必要',
    description:
      '日常基本饮食支出，包括三餐、买菜、米面粮油、基础食品、工作日便餐、家庭日常食材。不包括聚餐请客、高端餐厅、奶茶咖啡、零食饮料、夜宵、非必要外卖。',
  },
  {
    name: '居住刚性',
    description:
      '维持基本居住条件所需的固定或必要支出，包括房租、物业、水电燃气、取暖费、宽带、基础维修。不包括装修升级、装饰摆件、家电换新、改善型家居消费。',
  },
  {
    name: '债务还款',
    description:
      '偿还既有债务或信用负债的支出，包括房贷、车贷、信用卡还款、消费贷、借款还款、分期还款。不包括新的投资、储蓄、普通消费或账户间转账。',
  },
  {
    name: '生活必要',
    description:
      '维持基本生活、健康、工作和家庭责任的必要支出，包括通勤、基础通讯、医疗、教育、保险、赡养、基础日用品。不包括娱乐、旅游、兴趣消费、改善型购物。',
  },
  {
    name: '可选消费',
    description:
      '非生存必需、可延后或可减少的消费，包括娱乐、购物、旅游、奶茶咖啡、游戏、数码、服饰、美妆、聚餐、非必要外卖。不包括基本餐饮、刚性居住、债务还款、医疗教育等必要支出。',
  },
  {
    name: '转账投资',
    description:
      '资金在账户、资产或投资产品之间转移，不代表真实消费的支出，包括基金、股票、理财、储蓄转入、账户间转账、证券入金。不包括餐饮、购物、居住、债务还款等实际消费。',
  },
  {
    name: '不计入统计',
    description:
      '不应纳入消费结构判断，或无法可靠判断经济属性的记录，包括报销冲账、退款、内部调整、误记、无法判断、临时占位。不作为优先选择，只有无法归类时使用。',
  },
];

export async function seedCategoryIcons(client: PrismaClient): Promise<void> {
  const existingCount = await client.categoryIcon.count();
  if (existingCount > 0) {
    return;
  }

  const icons = [
    { icon: '🍜', name: '餐饮', sort: 1 },
    { icon: '🚌', name: '交通', sort: 2 },
    { icon: '🛍', name: '购物', sort: 3 },
    { icon: '🎮', name: '娱乐', sort: 4 },
    { icon: '🏠', name: '居家', sort: 5 },
    { icon: '💊', name: '医疗', sort: 6 },
    { icon: '📚', name: '教育', sort: 7 },
    { icon: '🎁', name: '人情', sort: 8 },
    { icon: '💰', name: '工资', sort: 9 },
    { icon: '💼', name: '兼职', sort: 10 },
    { icon: '📈', name: '理财', sort: 11 },
    { icon: '🧧', name: '红包', sort: 12 },
    { icon: '☕', name: '早餐', sort: 13 },
    { icon: '🍱', name: '午餐', sort: 14 },
    { icon: '🍽', name: '晚餐', sort: 15 },
    { icon: '🧋', name: '零食饮料', sort: 16 },
    { icon: '🥂', name: '餐厅聚餐', sort: 17 },
    { icon: '🛵', name: '外卖', sort: 18 },
    { icon: '🌙', name: '夜宵', sort: 19 },
    { icon: '🍵', name: '下午茶', sort: 20 },
    { icon: '🚇', name: '公交地铁', sort: 21 },
    { icon: '🚕', name: '打车', sort: 22 },
    { icon: '⛽', name: '加油', sort: 23 },
    { icon: '🅿', name: '停车', sort: 24 },
    { icon: '🚄', name: '高铁火车', sort: 25 },
    { icon: '🛫', name: '飞机出行', sort: 26 },
    { icon: '🚲', name: '共享单车', sort: 27 },
    { icon: '🛣', name: '过路费', sort: 28 },
    { icon: '🧴', name: '日用品', sort: 29 },
    { icon: '👗', name: '服装', sort: 30 },
    { icon: '📱', name: '数码电器', sort: 31 },
    { icon: '🛋', name: '家居用品', sort: 32 },
    { icon: '🛒', name: '食品杂货', sort: 33 },
    { icon: '💄', name: '美妆护肤', sort: 34 },
    { icon: '👜', name: '箱包配饰', sort: 35 },
    { icon: '🎽', name: '运动装备', sort: 36 },
    { icon: '🎬', name: '电影演出', sort: 37 },
    { icon: '🎯', name: '游戏', sort: 38 },
    { icon: '🏋', name: '运动健身', sort: 39 },
    { icon: '✈', name: '旅游', sort: 40 },
    { icon: '🎵', name: '书籍音乐', sort: 41 },
    { icon: '🎤', name: 'KTV', sort: 42 },
    { icon: '🎲', name: '桌游剧本杀', sort: 43 },
    { icon: '🐾', name: '宠物', sort: 44 },
    { icon: '🏠', name: '房租', sort: 45 },
    { icon: '💡', name: '水电燃气', sort: 46 },
    { icon: '🔧', name: '物业维修', sort: 47 },
    { icon: '📡', name: '宽带网络', sort: 48 },
    { icon: '🧹', name: '家政保洁', sort: 49 },
    { icon: '🪴', name: '装修装饰', sort: 50 },
    { icon: '🧻', name: '日用耗材', sort: 51 },
    { icon: '🏦', name: '购房贷款', sort: 52 },
    { icon: '🏥', name: '看病就医', sort: 53 },
    { icon: '💊', name: '药品', sort: 54 },
    { icon: '🩺', name: '体检', sort: 55 },
    { icon: '🦷', name: '口腔牙科', sort: 56 },
    { icon: '👓', name: '眼科视力', sort: 57 },
    { icon: '🧠', name: '心理咨询', sort: 58 },
    { icon: '💪', name: '保健品', sort: 59 },
    { icon: '🛡', name: '医疗保险', sort: 60 },
    { icon: '🎓', name: '学费', sort: 61 },
    { icon: '📖', name: '书籍文具', sort: 62 },
    { icon: '🎨', name: '培训课程', sort: 63 },
    { icon: '📝', name: '考试报名', sort: 64 },
    { icon: '💻', name: '网课订阅', sort: 65 },
    { icon: '🎸', name: '兴趣班', sort: 66 },
    { icon: '🌍', name: '留学费用', sort: 67 },
    { icon: '🔌', name: '工具软件', sort: 68 },
    { icon: '🧧', name: '红包礼金', sort: 69 },
    { icon: '🍽', name: '聚餐请客', sort: 70 },
    { icon: '💍', name: '婚礼份子钱', sort: 71 },
    { icon: '🎂', name: '生日礼物', sort: 72 },
    { icon: '🎀', name: '节日礼品', sort: 73 },
    { icon: '❤', name: '公益捐款', sort: 74 },
    { icon: '🤝', name: '朋友借款', sort: 75 },
    { icon: '👨‍👩‍👧', name: '家人赡养', sort: 76 },
    { icon: '💹', name: '提成', sort: 77 },
    { icon: '🏆', name: '年终奖', sort: 78 },
    { icon: '⏰', name: '加班费', sort: 79 },
    { icon: '💳', name: '津贴补贴', sort: 80 },
    { icon: '📋', name: '期权股权', sort: 81 },
    { icon: '📊', name: '股票基金', sort: 82 },
    { icon: '📜', name: '债券利息', sort: 83 },
    { icon: '🏘', name: '房租收入', sort: 84 },
    { icon: '🏦', name: '存款利息', sort: 85 },
    { icon: '🪙', name: '数字货币', sort: 86 },
    { icon: '💵', name: '退款', sort: 87 },
    { icon: '🎰', name: '中奖收入', sort: 88 },
    { icon: '♻', name: '二手出售', sort: 89 },
    { icon: '✍', name: '稿费版权', sort: 90 },
    { icon: '⚖', name: '赔偿收入', sort: 91 },
    { icon: '🏛', name: '政府补贴', sort: 92 },
  ];

  await client.categoryIcon.createMany({ data: icons });
}

export async function seedEconomicTags(
  client: PrismaClient,
  userId: bigint,
  ledgerId: bigint,
): Promise<void> {
  for (const tag of ECONOMIC_TAGS) {
    const existing = await client.tag.findFirst({
      where: {
        userId,
        ledgerId,
        name: tag.name,
        isDeleted: 0,
      },
    });

    const data = {
      description: tag.description,
      tagType: 'economic',
      canEdit: 0,
      canDelete: 0,
      isDeleted: 0,
    };

    if (existing) {
      await client.tag.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await client.tag.create({
        data: {
          userId,
          ledgerId,
          name: tag.name,
          ...data,
        },
      });
    }
  }
}

export async function seedUserData(client: PrismaClient, userId: bigint): Promise<void> {
  let defaultLedger = await client.ledger.findFirst({
    where: { userId, isDeleted: 0, isDefault: 1 },
  });
  if (!defaultLedger) {
    defaultLedger = await client.ledger.create({
      data: {
        userId,
        name: '日常账本',
        sceneType: 'personal',
        isDefault: 1,
      },
    });
  }

  await seedEconomicTags(client, userId, defaultLedger.id);

  const existingAccount = await client.account.findFirst({
    where: { userId, ledgerId: defaultLedger.id, isDeleted: 0 },
  });
  if (existingAccount) {
    return;
  }

  await client.account.create({
    data: {
      userId,
      ledgerId: defaultLedger.id,
      name: '现金',
      type: 1,
      balance: 0,
      icon: '💰',
      sort: 0,
      isDefault: 1,
    },
  });

  const expenseCategories = [
    {
      name: '餐饮',
      icon: '🍜',
      sort: 1,
      children: [
        { name: '早餐', icon: '☕', sort: 1 },
        { name: '午餐', icon: '🍱', sort: 2 },
        { name: '晚餐', icon: '🍽', sort: 3 },
        { name: '零食饮料', icon: '🧋', sort: 4 },
        { name: '餐厅聚餐', icon: '🥂', sort: 5 },
        { name: '外卖', icon: '🛵', sort: 6 },
        { name: '夜宵', icon: '🌙', sort: 7 },
        { name: '下午茶', icon: '🍵', sort: 8 },
      ],
    },
    {
      name: '交通',
      icon: '🚌',
      sort: 2,
      children: [
        { name: '公交地铁', icon: '🚇', sort: 1 },
        { name: '打车', icon: '🚕', sort: 2 },
        { name: '加油', icon: '⛽', sort: 3 },
        { name: '停车', icon: '🅿', sort: 4 },
        { name: '高铁火车', icon: '🚄', sort: 5 },
        { name: '飞机出行', icon: '🛫', sort: 6 },
        { name: '共享单车', icon: '🚲', sort: 7 },
        { name: '过路费', icon: '🛣', sort: 8 },
      ],
    },
    {
      name: '购物',
      icon: '🛍',
      sort: 3,
      children: [
        { name: '日用品', icon: '🧴', sort: 1 },
        { name: '服装', icon: '👗', sort: 2 },
        { name: '数码电器', icon: '📱', sort: 3 },
        { name: '家居用品', icon: '🛋', sort: 4 },
        { name: '食品杂货', icon: '🛒', sort: 5 },
        { name: '美妆护肤', icon: '💄', sort: 6 },
        { name: '箱包配饰', icon: '👜', sort: 7 },
        { name: '运动装备', icon: '🎽', sort: 8 },
      ],
    },
    {
      name: '娱乐',
      icon: '🎮',
      sort: 4,
      children: [
        { name: '电影演出', icon: '🎬', sort: 1 },
        { name: '游戏', icon: '🎯', sort: 2 },
        { name: '运动健身', icon: '🏋', sort: 3 },
        { name: '旅游', icon: '✈', sort: 4 },
        { name: '书籍音乐', icon: '🎵', sort: 5 },
        { name: 'KTV', icon: '🎤', sort: 6 },
        { name: '桌游剧本杀', icon: '🎲', sort: 7 },
        { name: '宠物', icon: '🐾', sort: 8 },
      ],
    },
    {
      name: '居家',
      icon: '🏠',
      sort: 5,
      children: [
        { name: '房租', icon: '🏠', sort: 1 },
        { name: '水电燃气', icon: '💡', sort: 2 },
        { name: '物业维修', icon: '🔧', sort: 3 },
        { name: '宽带网络', icon: '📡', sort: 4 },
        { name: '家政保洁', icon: '🧹', sort: 5 },
        { name: '装修装饰', icon: '🪴', sort: 6 },
        { name: '日用耗材', icon: '🧻', sort: 7 },
        { name: '购房贷款', icon: '🏦', sort: 8 },
      ],
    },
    {
      name: '医疗',
      icon: '💊',
      sort: 6,
      children: [
        { name: '看病就医', icon: '🏥', sort: 1 },
        { name: '药品', icon: '💊', sort: 2 },
        { name: '体检', icon: '🩺', sort: 3 },
        { name: '口腔牙科', icon: '🦷', sort: 4 },
        { name: '眼科视力', icon: '👓', sort: 5 },
        { name: '心理咨询', icon: '🧠', sort: 6 },
        { name: '保健品', icon: '💪', sort: 7 },
        { name: '医疗保险', icon: '🛡', sort: 8 },
      ],
    },
    {
      name: '教育',
      icon: '📚',
      sort: 7,
      children: [
        { name: '学费', icon: '🎓', sort: 1 },
        { name: '书籍文具', icon: '📖', sort: 2 },
        { name: '培训课程', icon: '🎨', sort: 3 },
        { name: '考试报名', icon: '📝', sort: 4 },
        { name: '网课订阅', icon: '💻', sort: 5 },
        { name: '兴趣班', icon: '🎸', sort: 6 },
        { name: '留学费用', icon: '🌍', sort: 7 },
        { name: '工具软件', icon: '🔌', sort: 8 },
      ],
    },
    {
      name: '人情',
      icon: '🎁',
      sort: 8,
      children: [
        { name: '红包礼金', icon: '🧧', sort: 1 },
        { name: '聚餐请客', icon: '🍽', sort: 2 },
        { name: '婚礼份子钱', icon: '💍', sort: 3 },
        { name: '生日礼物', icon: '🎂', sort: 4 },
        { name: '节日礼品', icon: '🎀', sort: 5 },
        { name: '公益捐款', icon: '❤', sort: 6 },
        { name: '朋友借款', icon: '🤝', sort: 7 },
        { name: '家人赡养', icon: '👨‍👩‍👧', sort: 8 },
      ],
    },
  ];

  const incomeCategories = [
    {
      name: '工作收入',
      icon: '💰',
      sort: 1,
      children: [
        { name: '工资', icon: '💰', sort: 1 },
        { name: '兼职', icon: '💼', sort: 2 },
        { name: '奖金', icon: '🎁', sort: 3 },
        { name: '提成', icon: '💹', sort: 4 },
        { name: '年终奖', icon: '🏆', sort: 5 },
        { name: '加班费', icon: '⏰', sort: 6 },
        { name: '津贴补贴', icon: '💳', sort: 7 },
        { name: '期权股权', icon: '📋', sort: 8 },
      ],
    },
    {
      name: '理财收入',
      icon: '📈',
      sort: 2,
      children: [
        { name: '理财', icon: '📈', sort: 1 },
        { name: '股票基金', icon: '📊', sort: 2 },
        { name: '债券利息', icon: '📜', sort: 3 },
        { name: '房租收入', icon: '🏘', sort: 4 },
        { name: '存款利息', icon: '🏦', sort: 5 },
        { name: '数字货币', icon: '🪙', sort: 6 },
        { name: '保险分红', icon: '🛡', sort: 7 },
        { name: '基金定投', icon: '💹', sort: 8 },
      ],
    },
    {
      name: '其他收入',
      icon: '🧧',
      sort: 3,
      children: [
        { name: '红包', icon: '🧧', sort: 1 },
        { name: '退款', icon: '💵', sort: 2 },
        { name: '其他', icon: '💡', sort: 3 },
        { name: '中奖收入', icon: '🎰', sort: 4 },
        { name: '二手出售', icon: '♻', sort: 5 },
        { name: '稿费版权', icon: '✍', sort: 6 },
        { name: '赔偿收入', icon: '⚖', sort: 7 },
        { name: '政府补贴', icon: '🏛', sort: 8 },
      ],
    },
  ];

  for (const parent of expenseCategories) {
    const parentCategory = await client.category.create({
      data: {
        userId,
        ledgerId: defaultLedger.id,
        name: parent.name,
        icon: parent.icon,
        type: 1,
        sort: parent.sort,
        parentId: null,
      },
    });

    for (const child of parent.children) {
      await client.category.create({
        data: {
          userId,
          ledgerId: defaultLedger.id,
          name: child.name,
          icon: child.icon,
          type: 1,
          sort: child.sort,
          parentId: parentCategory.id,
        },
      });
    }
  }

  for (const parent of incomeCategories) {
    const parentCategory = await client.category.create({
      data: {
        userId,
        ledgerId: defaultLedger.id,
        name: parent.name,
        icon: parent.icon,
        type: 2,
        sort: parent.sort,
        parentId: null,
      },
    });

    for (const child of parent.children) {
      await client.category.create({
        data: {
          userId,
          ledgerId: defaultLedger.id,
          name: child.name,
          icon: child.icon,
          type: 2,
          sort: child.sort,
          parentId: parentCategory.id,
        },
      });
    }
  }
}

async function main() {
  const client = new PrismaClient();
  try {
    await seedCategoryIcons(client);
    console.log('分类图标种子数据初始化完成');
  } finally {
    await client.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
