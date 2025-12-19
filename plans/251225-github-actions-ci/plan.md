# GitHub Actions CI/CD Setup

## Overview

Thiết lập CI/CD pipeline cho ISO Document Manager trên GitHub Actions, thay thế GitLab CI.

## Current State

- Dự án đã chuyển sang GitHub
- Không có CI/CD pipeline hiện tại
- Monorepo với Turbo
- NestJS API + Next.js Web
- PostgreSQL database
- Docker containerization

## Implementation Plan

### Phase 1: Core CI Workflow

- Install dependencies với caching
- Lint code (ESLint)
- Type checking (TypeScript)
- Unit tests (Jest với PostgreSQL)
- Build (NestJS + Next.js)

### Phase 2: Docker & Registry

- Build Docker images
- Push to GitHub Container Registry
- Multi-stage builds optimization

### Phase 3: Security & Quality

- CodeQL security scanning
- Dependency review
- Code coverage reporting

### Phase 4: Deployment

- Staging deployment (manual)
- Production deployment (tags only)

## Tech Stack

- GitHub Actions
- Node.js 20
- Turbo (monorepo)
- PostgreSQL 16
- Docker
- Jest

## Expected Outcome

Complete CI/CD pipeline với:

- Automated testing trên mỗi PR/push
- Docker image builds
- Security scanning
- Code quality checks
- Deployment workflows
