import {
  registerPage,
  getAllPages,
  getPageByPath,
  getPagesByModule,
  clearRegistry,
} from "../page-registry";
import type { PageMetadata } from "../types/page-metadata";

describe("Page Registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe("registerPage", () => {
    it("should register a page with valid metadata", () => {
      const metadata: PageMetadata = {
        path: "/dashboard/users",
        name: "User Management",
        module: "User",
        action: "view",
        icon: "Users",
        order: 5,
        requiresAuth: true,
      };

      expect(() => registerPage(metadata)).not.toThrow();
      expect(getAllPages()).toHaveLength(1);
    });

    it("should throw error if required fields are missing", () => {
      const invalidMetadata = {
        name: "User Management",
        module: "User",
      } as PageMetadata;

      expect(() => registerPage(invalidMetadata)).toThrow(
        "Invalid page metadata: missing required fields: path"
      );
    });

    it("should throw error with specific missing fields", () => {
      const invalidMetadata = {
        name: "User Management",
      } as PageMetadata;

      expect(() => registerPage(invalidMetadata)).toThrow(
        "Invalid page metadata: missing required fields: path, module"
      );
    });

    it("should normalize path by removing trailing slashes", () => {
      const metadata: PageMetadata = {
        path: "/dashboard/users/",
        name: "User Management",
        module: "User",
      };

      registerPage(metadata);
      const page = getPageByPath("/dashboard/users");
      expect(page).toBeDefined();
      expect(page?.path).toBe("/dashboard/users"); // Normalized
    });

    it("should throw error for invalid path format", () => {
      const invalidMetadata: PageMetadata = {
        path: "/invalid/path",
        name: "Invalid Page",
        module: "User",
      };

      expect(() => registerPage(invalidMetadata)).toThrow(
        /Invalid path format/
      );
    });

    it("should throw error for invalid module name format", () => {
      const invalidMetadata: PageMetadata = {
        path: "/dashboard/users",
        name: "User Management",
        module: "user", // lowercase, should be PascalCase
      };

      expect(() => registerPage(invalidMetadata)).toThrow(
        /Invalid module name/
      );
    });

    it("should throw error for module name with special characters", () => {
      const invalidMetadata: PageMetadata = {
        path: "/dashboard/users",
        name: "User Management",
        module: "User-Management", // contains hyphen
      };

      expect(() => registerPage(invalidMetadata)).toThrow(
        /Invalid module name/
      );
    });

    it("should overwrite duplicate pages with same path", () => {
      const metadata1: PageMetadata = {
        path: "/dashboard/users",
        name: "User Management",
        module: "User",
      };

      const metadata2: PageMetadata = {
        path: "/dashboard/users",
        name: "Users",
        module: "User",
      };

      registerPage(metadata1);
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      registerPage(metadata2);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Page metadata already registered")
      );
      expect(getAllPages()).toHaveLength(1);
      expect(getPageByPath("/dashboard/users")?.name).toBe("Users");

      consoleSpy.mockRestore();
    });
  });

  describe("getAllPages", () => {
    it("should return empty array when no pages registered", () => {
      expect(getAllPages()).toHaveLength(0);
    });

    it("should return all registered pages sorted by order", () => {
      const pages: PageMetadata[] = [
        {
          path: "/dashboard/users",
          name: "User Management",
          module: "User",
          order: 5,
        },
        {
          path: "/dashboard/departments",
          name: "Department Management",
          module: "Department",
          order: 3,
        },
        {
          path: "/dashboard/kpi",
          name: "KPI Tracking",
          module: "Kpi",
          order: 7,
        },
      ];

      pages.forEach((page) => registerPage(page));

      const allPages = getAllPages();
      expect(allPages).toHaveLength(3);
      expect(allPages[0].path).toBe("/dashboard/departments"); // order: 3
      expect(allPages[1].path).toBe("/dashboard/users"); // order: 5
      expect(allPages[2].path).toBe("/dashboard/kpi"); // order: 7
    });

    it("should handle pages without order (default to 0)", () => {
      const pages: PageMetadata[] = [
        {
          path: "/dashboard/users",
          name: "User Management",
          module: "User",
          order: 5,
        },
        {
          path: "/dashboard/departments",
          name: "Department Management",
          module: "Department",
          // no order
        },
      ];

      pages.forEach((page) => registerPage(page));

      const allPages = getAllPages();
      expect(allPages[0].path).toBe("/dashboard/departments"); // order: 0 (default)
      expect(allPages[1].path).toBe("/dashboard/users"); // order: 5
    });

    it("should handle negative order numbers", () => {
      const pages: PageMetadata[] = [
        {
          path: "/dashboard/users",
          name: "User Management",
          module: "User",
          order: -5,
        },
        {
          path: "/dashboard/departments",
          name: "Department Management",
          module: "Department",
          order: -3,
        },
        {
          path: "/dashboard/kpi",
          name: "KPI Tracking",
          module: "Kpi",
          order: 0,
        },
      ];

      pages.forEach((page) => registerPage(page));

      const allPages = getAllPages();
      expect(allPages[0].path).toBe("/dashboard/users"); // order: -5 (lowest)
      expect(allPages[1].path).toBe("/dashboard/departments"); // order: -3
      expect(allPages[2].path).toBe("/dashboard/kpi"); // order: 0
    });

    it("should handle very large order numbers", () => {
      const metadata: PageMetadata = {
        path: "/dashboard/users",
        name: "User Management",
        module: "User",
        order: Number.MAX_SAFE_INTEGER,
      };

      expect(() => registerPage(metadata)).not.toThrow();
      const page = getPageByPath("/dashboard/users");
      expect(page?.order).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle empty strings in optional fields", () => {
      const metadata: PageMetadata = {
        path: "/dashboard/users",
        name: "User Management",
        module: "User",
        action: "",
        icon: "",
      };

      expect(() => registerPage(metadata)).not.toThrow();
      const page = getPageByPath("/dashboard/users");
      expect(page?.action).toBe("");
      expect(page?.icon).toBe("");
    });

    it("should cache sorted result for performance", () => {
      const pages: PageMetadata[] = [
        {
          path: "/dashboard/users",
          name: "User Management",
          module: "User",
          order: 5,
        },
        {
          path: "/dashboard/departments",
          name: "Department Management",
          module: "Department",
          order: 3,
        },
      ];

      pages.forEach((page) => registerPage(page));

      const firstCall = getAllPages();
      const secondCall = getAllPages();

      // Should return same reference (cached)
      expect(firstCall).toBe(secondCall);
      expect(firstCall[0].path).toBe("/dashboard/departments");
    });

    it("should invalidate cache when new page is registered", () => {
      const metadata1: PageMetadata = {
        path: "/dashboard/users",
        name: "User Management",
        module: "User",
        order: 5,
      };

      registerPage(metadata1);
      const firstCall = getAllPages();

      const metadata2: PageMetadata = {
        path: "/dashboard/departments",
        name: "Department Management",
        module: "Department",
        order: 3,
      };

      registerPage(metadata2);
      const secondCall = getAllPages();

      // Should be different reference (cache invalidated)
      expect(firstCall).not.toBe(secondCall);
      expect(secondCall).toHaveLength(2);
      expect(secondCall[0].path).toBe("/dashboard/departments");
    });
  });

  describe("getPageByPath", () => {
    it("should return undefined for non-existent path", () => {
      expect(getPageByPath("/dashboard/nonexistent")).toBeUndefined();
    });

    it("should return page metadata for existing path", () => {
      const metadata: PageMetadata = {
        path: "/dashboard/users",
        name: "User Management",
        module: "User",
        action: "view",
        icon: "Users",
        order: 5,
      };

      registerPage(metadata);
      const page = getPageByPath("/dashboard/users");

      expect(page).toBeDefined();
      expect(page?.name).toBe("User Management");
      expect(page?.module).toBe("User");
      expect(page?.action).toBe("view");
      expect(page?.icon).toBe("Users");
      expect(page?.order).toBe(5);
    });
  });

  describe("getPagesByModule", () => {
    it("should return empty array for non-existent module", () => {
      expect(getPagesByModule("NonExistent")).toHaveLength(0);
    });

    it("should return all pages for a specific module", () => {
      const pages: PageMetadata[] = [
        {
          path: "/dashboard/users",
          name: "User Management",
          module: "User",
        },
        {
          path: "/dashboard/users/create",
          name: "Create User",
          module: "User",
        },
        {
          path: "/dashboard/departments",
          name: "Department Management",
          module: "Department",
        },
      ];

      pages.forEach((page) => registerPage(page));

      const userPages = getPagesByModule("User");
      expect(userPages).toHaveLength(2);
      expect(userPages.every((p) => p.module === "User")).toBe(true);

      const deptPages = getPagesByModule("Department");
      expect(deptPages).toHaveLength(1);
      expect(deptPages[0].module).toBe("Department");
    });
  });

  describe("clearRegistry", () => {
    it("should clear all registered pages", () => {
      const pages: PageMetadata[] = [
        {
          path: "/dashboard/users",
          name: "User Management",
          module: "User",
        },
        {
          path: "/dashboard/departments",
          name: "Department Management",
          module: "Department",
        },
      ];

      pages.forEach((page) => registerPage(page));
      expect(getAllPages()).toHaveLength(2);

      clearRegistry();
      expect(getAllPages()).toHaveLength(0);
    });
  });

  describe("Integration: Multiple pages", () => {
    it("should handle multiple pages with different modules and orders", () => {
      const pages: PageMetadata[] = [
        {
          path: "/dashboard/users",
          name: "User Management",
          module: "User",
          order: 5,
        },
        {
          path: "/dashboard/departments",
          name: "Department Management",
          module: "Department",
          order: 6,
        },
        {
          path: "/dashboard/kpi",
          name: "KPI Tracking",
          module: "Kpi",
          order: 7,
        },
        {
          path: "/dashboard/maintenance",
          name: "Maintenance Notices",
          module: "Maintenance",
          order: 8,
        },
        {
          path: "/dashboard/permissions",
          name: "Permission Management",
          module: "Permission",
          order: 9,
        },
      ];

      pages.forEach((page) => registerPage(page));

      expect(getAllPages()).toHaveLength(5);
      expect(getPageByPath("/dashboard/users")).toBeDefined();
      expect(getPageByPath("/dashboard/departments")).toBeDefined();
      expect(getPagesByModule("User")).toHaveLength(1);
      expect(getPagesByModule("Department")).toHaveLength(1);
    });
  });
});
