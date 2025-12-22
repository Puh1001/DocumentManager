import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

// Helper to find project root
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

describe("Phase 1: Build Pipeline Configuration", () => {
  const rootDir = findProjectRoot(__dirname);
  const appsDir = join(rootDir, "apps");

  describe("Root Package.json Scripts", () => {
    it("should have dev script using Turborepo", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts.dev).toContain("turbo");
      expect(packageJson.scripts.dev).toContain("dev");
    });

    it("should have build script with Prisma generation", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts.build).toContain("db:generate");
      expect(packageJson.scripts.build).toContain("turbo");
    });

    it("should have lint script using Turborepo", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts.lint).toContain("turbo");
      expect(packageJson.scripts.lint).toContain("lint");
    });

    it("should have test script using Turborepo", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts.test).toContain("turbo");
      expect(packageJson.scripts.test).toContain("test");
    });
  });

  describe("API Build Configuration", () => {
    it("should have build script in API package.json", () => {
      const packageJsonPath = join(appsDir, "api", "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts.build).toBe("nest build");
    });

    it("should have dev script with watch mode", () => {
      const packageJsonPath = join(appsDir, "api", "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts.dev).toContain("watch");
    });

    it("should have type-check script", () => {
      const packageJsonPath = join(appsDir, "api", "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts["type-check"]).toBeDefined();
      expect(packageJson.scripts["type-check"]).toContain("tsc");
    });
  });

  describe("Web Build Configuration", () => {
    it("should have build script in Web package.json", () => {
      const packageJsonPath = join(appsDir, "web", "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts.build).toBe("next build");
    });

    it("should have dev script with port configuration", () => {
      const packageJsonPath = join(appsDir, "web", "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts.dev).toContain("next dev");
      expect(packageJson.scripts.dev).toContain("--port");
    });

    it("should have type-check script", () => {
      const packageJsonPath = join(appsDir, "web", "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts["type-check"]).toBeDefined();
      expect(packageJson.scripts["type-check"]).toContain("tsc");
    });
  });

  describe("Turborepo Task Configuration", () => {
    it("should have build task with dependencies", () => {
      const turboJsonPath = join(rootDir, "turbo.json");
      const turboJson = JSON.parse(readFileSync(turboJsonPath, "utf-8"));

      expect(turboJson.tasks.build.dependsOn).toContain("^build");
      expect(turboJson.tasks.build.outputs).toBeDefined();
    });

    it("should have dev task configured as persistent", () => {
      const turboJsonPath = join(rootDir, "turbo.json");
      const turboJson = JSON.parse(readFileSync(turboJsonPath, "utf-8"));

      expect(turboJson.tasks.dev.persistent).toBe(true);
      expect(turboJson.tasks.dev.cache).toBe(false);
    });

    it("should have lint task with build dependency", () => {
      const turboJsonPath = join(rootDir, "turbo.json");
      const turboJson = JSON.parse(readFileSync(turboJsonPath, "utf-8"));

      expect(turboJson.tasks.lint.dependsOn).toContain("^build");
    });

    it("should have test task with build dependency", () => {
      const turboJsonPath = join(rootDir, "turbo.json");
      const turboJson = JSON.parse(readFileSync(turboJsonPath, "utf-8"));

      expect(turboJson.tasks.test.dependsOn).toContain("^build");
    });
  });

  describe("Database Scripts", () => {
    it("should have db:generate script", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts["db:generate"]).toBeDefined();
      expect(packageJson.scripts["db:generate"]).toContain("prisma generate");
    });

    it("should have db:migrate script", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts["db:migrate"]).toBeDefined();
      expect(packageJson.scripts["db:migrate"]).toContain("prisma migrate");
    });

    it("should have db:push script", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts["db:push"]).toBeDefined();
      expect(packageJson.scripts["db:push"]).toContain("prisma db push");
    });
  });
});
