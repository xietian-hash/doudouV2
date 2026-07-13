import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserStats() {
    const [todayRows, weekRows, totalRows, userRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT user_id) AS cnt
        FROM bills
        WHERE is_deleted = 0 AND DATE(bill_date) = CURDATE()
      `,
      this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT user_id) AS cnt
        FROM bills
        WHERE is_deleted = 0 AND YEARWEEK(bill_date, 1) = YEARWEEK(CURDATE(), 1)
      `,
      this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT user_id) AS cnt
        FROM bills
        WHERE is_deleted = 0
      `,
      this.prisma.$queryRaw<
        Array<{
          id: bigint;
          nickname: string | null;
          bill_count: bigint;
          last_active_date: Date | null;
        }>
      >`
        SELECT u.id, u.nickname,
               COUNT(b.id) AS bill_count,
               DATE(MAX(b.bill_date)) AS last_active_date
        FROM users u
        LEFT JOIN bills b ON u.id = b.user_id AND b.is_deleted = 0
        WHERE u.is_deleted = 0
        GROUP BY u.id, u.nickname
        ORDER BY bill_count DESC
      `,
    ]);

    return {
      todayActive: Number(todayRows[0]?.cnt ?? 0),
      weekActive: Number(weekRows[0]?.cnt ?? 0),
      totalActive: Number(totalRows[0]?.cnt ?? 0),
      userList: userRows.map((row) => ({
        id: row.id.toString(),
        nickname: row.nickname || '未设置昵称',
        billCount: Number(row.bill_count),
        lastActiveDate: row.last_active_date ? this.formatDate(row.last_active_date) : null,
      })),
    };
  }

  private formatDate(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
