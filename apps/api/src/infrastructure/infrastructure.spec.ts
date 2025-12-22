import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

// Helper to find project root by looking for turbo.json
function findProjectRoot(startPath: string): string {
  let current = resolve(startPath);
  while (current !== resolve(current, "..")) {
    if (existsSync(join(current, "turbo.json"))) {
      return current;
    }
    current = resolve(current, "..");
  }
  throw new Error("Could not find project root");
}

describe("Phase 1: Project Setup & Infrastructure", () => {
  const rootDir = findProjectRoot(__dirname);
  const appsDir = join(rootDir, "apps");
  const packagesDir = join(rootDir, "packages");
  const prismaDir = join(appsDir, "api", "prisma");

  describe("1.1 Monorepo Structure", () => {
    it("should have root package.json with workspaces configured", () => {
      const packageJsonPath = join(rootDir, "package.json");
      expect(existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.workspaces).toBeDefined();
      expect(packageJson.workspaces).toContain("apps/*");
      expect(packageJson.workspaces).toContain("packages/*");
    });

    it("should have Turborepo configuration", () => {
      const turboJsonPath = join(rootDir, "turbo.json");
      expect(existsSync(turboJsonPath)).toBe(true);

      const turboJson = JSON.parse(readFileSync(turboJsonPath, "utf-8"));
      expect(turboJson.tasks).toBeDefined();
      expect(turboJson.tasks.build).toBeDefined();
      expect(turboJson.tasks.dev).toBeDefined();
      expect(turboJson.tasks.lint).toBeDefined();
      expect(turboJson.tasks.test).toBeDefined();
    });

    it("should have apps directory structure", () => {
      expect(existsSync(appsDir)).toBe(true);
      expect(existsSync(join(appsDir, "web"))).toBe(true);
      expect(existsSync(join(appsDir, "api"))).toBe(true);
    });

    it("should have packages directory structure", () => {
      expect(existsSync(packagesDir)).toBe(true);
      expect(existsSync(join(packagesDir, "shared"))).toBe(true);
    });
  });

  describe("1.2 Next.js Frontend Setup", () => {
    const webDir = join(appsDir, "web");

    it("should have Next.js configuration file", () => {
      const nextConfigPath = join(webDir, "next.config.js");
      expect(existsSync(nextConfigPath)).toBe(true);
    });

    it("should have TypeScript configuration", () => {
      const tsConfigPath = join(webDir, "tsconfig.json");
      expect(existsSync(tsConfigPath)).toBe(true);

      const tsConfig = JSON.parse(readFileSync(tsConfigPath, "utf-8"));
      expect(tsConfig.compilerOptions).toBeDefined();
      expect(tsConfig.compilerOptions.jsx).toBe("preserve");
    });

    it("should have Tailwind CSS configuration", () => {
      const tailwindConfigPath = join(webDir, "tailwind.config.js");
      expect(existsSync(tailwindConfigPath)).toBe(true);
    });

    it("should have PostCSS configuration", () => {
      const postcssConfigPath = join(webDir, "postcss.config.js");
      expect(existsSync(postcssConfigPath)).toBe(true);
    });

    it("should have required directory structure", () => {
      expect(existsSync(join(webDir, "src"))).toBe(true);
      expect(existsSync(join(webDir, "src/app"))).toBe(true);
      expect(existsSync(join(webDir, "src/components"))).toBe(true);
      expect(existsSync(join(webDir, "src/lib"))).toBe(true);
      expect(existsSync(join(webDir, "src/hooks"))).toBe(true);
    });

    it("should have package.json with Next.js dependencies", () => {
      const packageJsonPath = join(webDir, "package.json");
      expect(existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies.next).toBeDefined();
      expect(packageJson.dependencies.react).toBeDefined();
      expect(packageJson.dependencies["react-dom"]).toBeDefined();
    });

    it("should have ESLint configuration", () => {
      const eslintConfigPath = join(webDir, ".eslintrc.json");
      expect(existsSync(eslintConfigPath)).toBe(true);
    });
  });

  describe("1.3 NestJS Backend Setup", () => {
    const apiDir = join(appsDir, "api");

    it("should have NestJS configuration files", () => {
      expect(existsSync(join(apiDir, "nest-cli.json"))).toBe(true);
      expect(existsSync(join(apiDir, "tsconfig.json"))).toBe(true);
    });

    it("should have TypeScript configuration with decorators enabled", () => {
      const tsConfigPath = join(apiDir, "tsconfig.json");
      const tsConfig = JSON.parse(readFileSync(tsConfigPath, "utf-8"));

      expect(tsConfig.compilerOptions.experimentalDecorators).toBe(true);
      expect(tsConfig.compilerOptions.emitDecoratorMetadata).toBe(true);
    });

    it("should have required directory structure", () => {
      expect(existsSync(join(apiDir, "src"))).toBe(true);
      expect(existsSync(join(apiDir, "src/modules"))).toBe(true);
      expect(existsSync(join(apiDir, "src/common"))).toBe(true);
      expect(existsSync(join(apiDir, "src/main.ts"))).toBe(true);
      expect(existsSync(join(apiDir, "src/app.module.ts"))).toBe(true);
    });

    it("should have package.json with NestJS dependencies", () => {
      const packageJsonPath = join(apiDir, "package.json");
      expect(existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies["@nestjs/common"]).toBeDefined();
      expect(packageJson.dependencies["@nestjs/core"]).toBeDefined();
      expect(packageJson.dependencies["@nestjs/config"]).toBeDefined();
    });

    it("should have Jest configuration", () => {
      const jestConfigPath = join(apiDir, "jest.config.js");
      expect(existsSync(jestConfigPath)).toBe(true);
    });

    it("should have ESLint configuration", () => {
      const eslintConfigPath = join(apiDir, ".eslintrc.js");
      expect(existsSync(eslintConfigPath)).toBe(true);
    });
  });

  describe("1.4 Prisma Configuration", () => {
    it("should have Prisma schema file", () => {
      const schemaPath = join(prismaDir, "schema.prisma");
      expect(existsSync(schemaPath)).toBe(true);
    });

    it("should have Prisma migrations directory", () => {
      const migrationsDir = join(prismaDir, "migrations");
      expect(existsSync(migrationsDir)).toBe(true);
    });

    it("should have Prisma in API package.json", () => {
      const packageJsonPath = join(appsDir, "api", "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.dependencies["@prisma/client"]).toBeDefined();
      expect(packageJson.devDependencies.prisma).toBeDefined();
    });
  });

  describe("1.5 Docker Compose Configuration", () => {
    it("should have docker-compose.yml file", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      expect(existsSync(dockerComposePath)).toBe(true);
    });

    it("should have PostgreSQL service configured", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("postgres");
      expect(dockerCompose).toContain("POSTGRES_DB");
      expect(dockerCompose).toContain("POSTGRES_USER");
      expect(dockerCompose).toContain("POSTGRES_PASSWORD");
    });
  });

  describe("1.6 Build Scripts", () => {
    it("should have build scripts in root package.json", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
    });

    it("should have database scripts in root package.json", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts["db:generate"]).toBeDefined();
      expect(packageJson.scripts["db:migrate"]).toBeDefined();
      expect(packageJson.scripts["db:push"]).toBeDefined();
    });
  });

  describe("1.7 Shared Package", () => {
    const sharedDir = join(packagesDir, "shared");

    it("should have shared package directory", () => {
      expect(existsSync(sharedDir)).toBe(true);
    });

    it("should have shared package.json", () => {
      const packageJsonPath = join(sharedDir, "package.json");
      expect(existsSync(packageJsonPath)).toBe(true);
    });

    it("should have types directory", () => {
      expect(existsSync(join(sharedDir, "src"))).toBe(true);
      expect(existsSync(join(sharedDir, "src/types"))).toBe(true);
    });
  });
});
