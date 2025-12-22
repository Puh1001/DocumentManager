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

describe("Phase 1: Docker Compose Configuration", () => {
  const rootDir = findProjectRoot(__dirname);

  describe("Docker Compose File", () => {
    it("should have docker-compose.yml file", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      expect(existsSync(dockerComposePath)).toBe(true);
    });

    it("should have valid YAML version", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toMatch(/version:\s*["']?3\./);
    });
  });

  describe("PostgreSQL Service", () => {
    it("should have PostgreSQL service defined", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("postgres:");
    });

    it("should have PostgreSQL image specified", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toMatch(/image:\s*postgres/i);
    });

    it("should have required environment variables", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("POSTGRES_DB");
      expect(dockerCompose).toContain("POSTGRES_USER");
      expect(dockerCompose).toContain("POSTGRES_PASSWORD");
    });

    it("should have port mapping configured", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("5432:5432");
    });

    it("should have volume configured", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("volumes:");
      expect(dockerCompose).toContain("postgres_data");
    });

    it("should have healthcheck configured", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("healthcheck");
    });
  });

  describe("Volume Configuration", () => {
    it("should have volumes section defined", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("volumes:");
    });

    it("should have postgres_data volume", () => {
      const dockerComposePath = join(rootDir, "docker-compose.yml");
      const dockerCompose = readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("postgres_data:");
    });
  });
});
