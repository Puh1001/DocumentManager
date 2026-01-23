import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingQueries: number;
  maxConnections: number;
  utilizationPercent: number;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL_MS = 60000; // 1 minute
  private readonly WARNING_THRESHOLD = 0.8; // 80% utilization

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.startConnectionPoolMonitoring();
  }

  async onModuleDestroy() {
    this.stopConnectionPoolMonitoring();
    await this.$disconnect();
  }

  /**
   * Get connection pool statistics from PostgreSQL
   * Note: Prisma $metrics is deprecated in v6.14+, so we query PostgreSQL directly
   */
  async getConnectionPoolStats(): Promise<ConnectionPoolStats | null> {
    try {
      // Query PostgreSQL for connection stats
      // Using Prisma.$queryRawUnsafe for complex queries
      const result = await this.$queryRawUnsafe<Array<{
        count: number;
        state: string;
        max_conn: number;
      }>>(`
        SELECT 
          COUNT(*)::int as count,
          state,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_conn
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state, max_conn
      `);

      const statsByState = new Map<string, number>();
      let maxConnections = 100; // Default

      for (const row of result) {
        statsByState.set(row.state, row.count);
        maxConnections = row.max_conn;
      }

      const activeConnections = statsByState.get('active') || 0;
      const idleConnections = statsByState.get('idle') || 0;
      const idleInTransaction = statsByState.get('idle in transaction') || 0;
      const totalConnections = activeConnections + idleConnections + idleInTransaction;
      const utilizationPercent = maxConnections > 0 
        ? (totalConnections / maxConnections) * 100 
        : 0;

      return {
        totalConnections,
        activeConnections,
        idleConnections: idleConnections + idleInTransaction,
        waitingQueries: 0, // Would need pg_locks to get accurate waiting count
        maxConnections,
        utilizationPercent,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get connection pool stats: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Start periodic monitoring of connection pool
   */
  private startConnectionPoolMonitoring() {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      const stats = await this.getConnectionPoolStats();
      if (stats) {
        // Log stats periodically
        if (stats.utilizationPercent > this.WARNING_THRESHOLD * 100) {
          this.logger.warn(
            `[DB POOL] High utilization: ${stats.utilizationPercent.toFixed(1)}% ` +
            `(${stats.totalConnections}/${stats.maxConnections} connections)`
          );
        }
      }
    }, this.MONITORING_INTERVAL_MS);

    this.logger.log(
      `Connection pool monitoring started (interval: ${this.MONITORING_INTERVAL_MS}ms, threshold: ${this.WARNING_THRESHOLD * 100}%)`
    );
  }

  /**
   * Stop connection pool monitoring
   */
  private stopConnectionPoolMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.log('Connection pool monitoring stopped');
    }
  }
}

// Export Prisma types for convenience
export { Prisma } from '@prisma/client';

