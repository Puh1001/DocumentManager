# Research Report: Database & API Architecture

## Database Schema Design

### New Models Required

#### 1. Department Model

```prisma
model Department {
  id        String      @id @default(uuid())
  name      String      @unique
  code      String      @unique
  createdAt DateTime    @default(now())
  kpis      KpiRecord[]
}
```

#### 2. KpiRecord Model

```prisma
model KpiRecord {
  id           String        @id @default(uuid())
  departmentId String
  year         Int
  title        String        // e.g., "梭织转机效率 Hiệu quả chuyển máy dệt thoi"
  target       String        // e.g., "≥85%"
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  department   Department    @relation(...)
  metrics      KpiMetric[]
}
```

#### 3. KpiMetric Model

```prisma
model KpiMetric {
  id          String     @id @default(uuid())
  kpiRecordId String
  name        String     // e.g., "理论转机数量 Số máy cần chuyển"
  type        MetricType // TARGET, ACTUAL, CALCULATED
  values      Json       // {month1: 0, month2: 0, ...}
  sortOrder   Int

  kpiRecord   KpiRecord  @relation(...)
}
```

## API Endpoints Design

### KPI Module Routes

```
GET    /api/kpi/departments      # List departments
GET    /api/kpi/records          # List KPI records (filter by dept, year)
GET    /api/kpi/records/:id      # Get single record with metrics
POST   /api/kpi/records          # Create KPI record
PATCH  /api/kpi/records/:id      # Update KPI record
DELETE /api/kpi/records/:id      # Delete KPI record

POST   /api/kpi/metrics          # Add metric row
PATCH  /api/kpi/metrics/:id      # Update metric values
DELETE /api/kpi/metrics/:id      # Delete metric row

GET    /api/kpi/records/:id/export  # Export to Excel
```

## Calculation Logic

- **Efficiency**: (actual / target) \* 100
- **Average**: Sum of valid months / Count of valid months
- Handle division by zero (#DIV/0!)

## Existing Codebase Patterns

- NestJS module structure: `{feature}.module.ts`, `{feature}.controller.ts`, `{feature}.service.ts`
- DTOs with `class-validator` decorators
- Prisma for database operations
- API response format: `{ data, total, page, limit }`
