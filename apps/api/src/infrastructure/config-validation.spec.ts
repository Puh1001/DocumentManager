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

describe("Phase 1: Configuration Validation", () => {
  const rootDir = findProjectRoot(__dirname);
  const appsDir = join(rootDir, "apps");

  describe("Turborepo Configuration", () => {
    it("should have valid turbo.json schema", () => {
      const turboJsonPath = join(rootDir, "turbo.json");
      const turboJson = JSON.parse(readFileSync(turboJsonPath, "utf-8"));

      expect(turboJson.$schema).toBe("https://turbo.build/schema.json");
      expect(turboJson.tasks).toBeDefined();
    });

    it("should have correct task dependencies", () => {
      const turboJsonPath = join(rootDir, "turbo.json");
      const turboJson = JSON.parse(readFileSync(turboJsonPath, "utf-8"));

      expect(turboJson.tasks.build.dependsOn).toContain("^build");
      expect(turboJson.tasks.lint.dependsOn).toContain("^build");
      expect(turboJson.tasks.test.dependsOn).toContain("^build");
    });

    it("should have correct output configurations", () => {
      const turboJsonPath = join(rootDir, "turbo.json");
      const turboJson = JSON.parse(readFileSync(turboJsonPath, "utf-8"));

      expect(turboJson.tasks.build.outputs).toBeDefined();
      expect(turboJson.tasks.build.outputs).toContain(".next/**");
      expect(turboJson.tasks.build.outputs).toContain("dist/**");
    });
  });

  describe("Next.js Configuration", () => {
    it("should have valid next.config.js", () => {
      const nextConfigPath = join(appsDir, "web", "next.config.js");
      const configContent = readFileSync(nextConfigPath, "utf-8");

      expect(configContent).toContain("reactStrictMode");
      expect(configContent).toContain("rewrites");
    });

    it("should have TypeScript paths configured correctly", () => {
      const tsConfigPath = join(appsDir, "web", "tsconfig.json");
      const tsConfig = JSON.parse(readFileSync(tsConfigPath, "utf-8"));

      expect(tsConfig.compilerOptions.paths).toBeDefined();
      expect(tsConfig.compilerOptions.paths["@/*"]).toEqual(["./src/*"]);
    });

    it("should have Tailwind CSS configured", () => {
      const tailwindConfigPath = resolve(appsDir, "web", "tailwind.config.js");
      expect(() => {
        require(tailwindConfigPath);
      }).not.toThrow();
    });
  });

  describe("NestJS Configuration", () => {
    it("should have valid nest-cli.json", () => {
      const nestCliPath = join(appsDir, "api", "nest-cli.json");
      const nestCli = JSON.parse(readFileSync(nestCliPath, "utf-8"));

      expect(nestCli).toBeDefined();
    });

    it("should have TypeScript paths configured correctly", () => {
      const tsConfigPath = join(appsDir, "api", "tsconfig.json");
      const tsConfig = JSON.parse(readFileSync(tsConfigPath, "utf-8"));

      expect(tsConfig.compilerOptions.paths).toBeDefined();
      expect(tsConfig.compilerOptions.paths["@/*"]).toEqual(["src/*"]);
    });

    it("should have Jest module name mapper configured", () => {
      const jestConfigPath = resolve(appsDir, "api", "jest.config.js");
      const jestConfig = require(jestConfigPath);

      expect(jestConfig.moduleNameMapper).toBeDefined();
      expect(jestConfig.moduleNameMapper["^@/(.*)$"]).toBe("<rootDir>/$1");
    });
  });

  describe("Docker Compose Configuration", () => {
    it("should have valid YAML structure", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("version:");
      expect(dockerCompose).toContain("services:");
      expect(dockerCompose).toContain("postgres:");
    });

    it("should have PostgreSQL service with required environment variables", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("POSTGRES_DB");
      expect(dockerCompose).toContain("POSTGRES_USER");
      expect(dockerCompose).toContain("POSTGRES_PASSWORD");
      expect(dockerCompose).toContain("5432:5432");
    });

    it("should have healthcheck configured", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("healthcheck");
    });
  });

  describe("Package.json Scripts", () => {
    it("should have all required scripts in root package.json", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      const requiredScripts = ["dev", "build", "lint", "test"];
      requiredScripts.forEach((script) => {
        expect(packageJson.scripts[script]).toBeDefined();
      });
    });

    it("should have database scripts", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts["db:generate"]).toContain("prisma generate");
      expect(packageJson.scripts["db:migrate"]).toContain("prisma migrate");
    });

    it("should use Turborepo for parallel execution", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.scripts.dev).toContain("turbo");
      expect(packageJson.scripts.build).toContain("turbo");
      expect(packageJson.scripts.lint).toContain("turbo");
    });
  });

  describe("Node.js Version", () => {
    it("should specify Node.js version requirement", () => {
      const packageJsonPath = join(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      expect(packageJson.engines).toBeDefined();
      expect(packageJson.engines.node).toBeDefined();
      expect(packageJson.engines.node).toMatch(/>=/);
    });
  });
});
