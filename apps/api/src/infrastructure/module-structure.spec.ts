import { existsSync } from "fs";
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

describe("Phase 1: Module Structure Validation", () => {
  const apiDir = findApiDir(__dirname);
  const srcDir = join(apiDir, "src");

  describe("NestJS App Module Structure", () => {
    it("should have AppModule defined", () => {
      const appModulePath = join(srcDir, "app.module.ts");
      expect(existsSync(appModulePath)).toBe(true);
    });

    it("should have main.ts entry point", () => {
      const mainPath = join(srcDir, "main.ts");
      expect(existsSync(mainPath)).toBe(true);
    });

    it("should have common directory with utilities", () => {
      expect(existsSync(join(srcDir, "common"))).toBe(true);
      expect(existsSync(join(srcDir, "common/prisma"))).toBe(true);
      expect(existsSync(join(srcDir, "common/decorators"))).toBe(true);
      expect(existsSync(join(srcDir, "common/types"))).toBe(true);
    });

    it("should have modules directory structure", () => {
      expect(existsSync(join(srcDir, "modules"))).toBe(true);
      expect(existsSync(join(srcDir, "modules/auth"))).toBe(true);
      expect(existsSync(join(srcDir, "modules/users"))).toBe(true);
      expect(existsSync(join(srcDir, "modules/storage"))).toBe(true);
      expect(existsSync(join(srcDir, "modules/authorization"))).toBe(true);
    });
  });

  describe("Module Organization", () => {
    const modulesDir = join(srcDir, "modules");

    it("should have auth module with required files", () => {
      const authDir = join(modulesDir, "auth");
      expect(existsSync(join(authDir, "auth.module.ts"))).toBe(true);
      expect(existsSync(join(authDir, "auth.service.ts"))).toBe(true);
      expect(existsSync(join(authDir, "auth.controller.ts"))).toBe(true);
      expect(existsSync(join(authDir, "guards"))).toBe(true);
      expect(existsSync(join(authDir, "strategies"))).toBe(true);
      expect(existsSync(join(authDir, "dto"))).toBe(true);
    });

    it("should have users module with required files", () => {
      const usersDir = join(modulesDir, "users");
      expect(existsSync(join(usersDir, "users.module.ts"))).toBe(true);
      expect(existsSync(join(usersDir, "users.service.ts"))).toBe(true);
      expect(existsSync(join(usersDir, "users.controller.ts"))).toBe(true);
      expect(existsSync(join(usersDir, "dto"))).toBe(true);
    });

    it("should have storage module with required structure", () => {
      const storageDir = join(modulesDir, "storage");
      expect(existsSync(join(storageDir, "storage.module.ts"))).toBe(true);
      expect(existsSync(join(storageDir, "services"))).toBe(true);
      expect(existsSync(join(storageDir, "controllers"))).toBe(true);
      expect(existsSync(join(storageDir, "handlers"))).toBe(true);
      expect(existsSync(join(storageDir, "dto"))).toBe(true);
    });

    it("should have authorization module with required structure", () => {
      const authzDir = join(modulesDir, "authorization");
      expect(existsSync(join(authzDir, "authorization.module.ts"))).toBe(true);
      expect(existsSync(join(authzDir, "services"))).toBe(true);
      expect(existsSync(join(authzDir, "controllers"))).toBe(true);
      expect(existsSync(join(authzDir, "guards"))).toBe(true);
      expect(existsSync(join(authzDir, "factories"))).toBe(true);
      expect(existsSync(join(authzDir, "decorators"))).toBe(true);
    });
  });

  describe("Common Utilities", () => {
    it("should have Prisma module and service", () => {
      const prismaDir = join(srcDir, "common/prisma");
      expect(existsSync(join(prismaDir, "prisma.module.ts"))).toBe(true);
      expect(existsSync(join(prismaDir, "prisma.service.ts"))).toBe(true);
    });

    it("should have common decorators", () => {
      const decoratorsDir = join(srcDir, "common/decorators");
      expect(existsSync(decoratorsDir)).toBe(true);
    });

    it("should have common types", () => {
      const typesDir = join(srcDir, "common/types");
      expect(existsSync(typesDir)).toBe(true);
    });
  });
});
