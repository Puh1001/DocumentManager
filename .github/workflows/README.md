# GitHub Actions Workflows

CI/CD pipelines cho ISO Document Manager trên GitHub Actions.

## Workflows

### 1. CI (`ci.yml`)

Chạy trên mỗi push và pull request:

- **Lint**: Kiểm tra code style với ESLint
- **Type Check**: TypeScript type checking cho API và Web
- **Test API**: Jest tests với PostgreSQL service
- **Test Web**: Frontend tests (nếu có)
- **Build API**: Build NestJS application
- **Build Web**: Build Next.js application

**Triggers:**

- Push to `main`, `master`, `develop`
- Pull requests to `main`, `master`, `develop`

### 2. Docker (`docker.yml`)

Build và push Docker images lên GitHub Container Registry:

- **API Image**: `ghcr.io/Puh1001/DocumentManager/api`
- **Web Image**: `ghcr.io/Puh1001/DocumentManager/web`

**Triggers:**

- Push to `main`, `master`
- Tags starting with `v*`
- Manual dispatch

**Features:**

- Multi-platform builds (amd64, arm64)
- Build cache optimization
- Automatic tagging

### 3. Security (`security.yml`)

Security scanning:

- **CodeQL**: Static code analysis
- **Dependency Review**: Check for vulnerable dependencies

**Triggers:**

- Push to `main`, `master`
- Pull requests to `main`, `master`
- Weekly schedule (Monday 00:00 UTC)

### 4. Deploy (`deploy.yml`)

Deployment workflows:

- **Staging**: Manual deployment
- **Production**: Automatic on tags `v*` or manual

**Triggers:**

- Tags starting with `v*`
- Manual workflow dispatch

## Usage

### Running Workflows

Workflows tự động chạy khi:

- Push code lên repository
- Tạo pull request
- Tạo tags (cho Docker và Deploy)

### Manual Trigger

1. Vào **Actions** tab trên GitHub
2. Chọn workflow muốn chạy
3. Click **Run workflow**

### Docker Images

Sau khi build thành công, images có sẵn tại:

- `ghcr.io/Puh1001/DocumentManager/api:latest`
- `ghcr.io/Puh1001/DocumentManager/web:latest`

Để pull images:

```bash
docker pull ghcr.io/Puh1001/DocumentManager/api:latest
docker pull ghcr.io/Puh1001/DocumentManager/web:latest
```

## Configuration

### Environment Variables

Workflows sử dụng:

- `NODE_VERSION`: Node.js version (default: 20)
- `TURBO_TOKEN`: GitHub token cho Turbo cache
- `REGISTRY`: Container registry (ghcr.io)

### Secrets

Không cần secrets bổ sung, workflows sử dụng `GITHUB_TOKEN` tự động.

## Troubleshooting

### Build Failures

1. Kiểm tra logs trong Actions tab
2. Verify Node.js version compatibility
3. Check database connection trong test jobs

### Docker Build Issues

1. Verify Dockerfile paths
2. Check build context
3. Review cache settings

### Security Alerts

1. Review CodeQL findings
2. Update vulnerable dependencies
3. Fix security issues được báo cáo
