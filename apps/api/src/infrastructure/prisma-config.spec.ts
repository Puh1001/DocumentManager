import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

// Helper to find API directory
function findApiDir(startPath: string): string {
  let current = resolve(startPath);
  while (current !== resolve(current, "..")) {
    if (existsSync(join(current, "nest-cli.json"))) {
      return current;
    }
    current = resolve(current, "..");
  }
  throw new Error("Could not find API directory");
}

describe("Phase 1: Prisma Configuration", () => {
  const apiDir = findApiDir(__dirname);
  const prismaDir = join(apiDir, "prisma");

  describe("Prisma Schema", () => {
    it("should have schema.prisma file", () => {
      const schemaPath = join(prismaDir, "schema.prisma");
      expect(existsSync(schemaPath)).toBe(true);
    });

    it("should have valid Prisma schema structure", () => {
      const schemaPath = join(prismaDir, "schema.prisma");
      const schemaContent = readFileSync(schemaPath, "utf-8");

      expect(schemaContent).toContain("generator client");
      expect(schemaContent).toContain("datasource db");
      expect(schemaContent).toContain("provider");
    });

    it("should have PostgreSQL as database provider", () => {
      const schemaPath = join(prismaDir, "schema.prisma");
      const schemaContent = readFileSync(schemaPath, "utf-8");

      expect(schemaContent).toMatch(/provider\s*=\s*["']postgresql["']/i);
    });

    it("should have database URL environment variable", () => {
      const schemaPath = join(prismaDir, "schema.prisma");
      const schemaContent = readFileSync(schemaPath, "utf-8");

      expect(schemaContent).toMatch(/url\s*=\s*env\(["']DATABASE_URL["']\)/i);
    });
  });

  describe("Prisma Migrations", () => {
    it("should have migrations directory", () => {
      const migrationsDir = join(prismaDir, "migrations");
      expect(existsSync(migrationsDir)).toBe(true);
    });
  });

  describe("Prisma Service Integration", () => {
    it("should have PrismaService in common/prisma", () => {
      const prismaServicePath = join(
        apiDir,
        "src",
        "common",
        "prisma",
        "prisma.service.ts"
      );
      expect(existsSync(prismaServicePath)).toBe(true);
    });

    it("should have PrismaModule in common/prisma", () => {
      const prismaModulePath = join(
        apiDir,
        "src",
        "common",
        "prisma",
        "prisma.module.ts"
      );
      expect(existsSync(prismaModulePath)).toBe(true);
    });
  });

  describe("Package Dependencies", () => {
    it("should have @prisma/client in dependencies", () => {
      const packageJsonPath = join(apiDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.dependencies["@prisma/client"]).toBeDefined();
    });

    it("should have prisma in devDependencies", () => {
      const packageJsonPath = join(apiDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.devDependencies.prisma).toBeDefined();
    });
  });
});
