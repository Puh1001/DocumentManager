import { PrismaService } from "../prisma/prisma.service";
import { Prisma, PrismaClient } from "@prisma/client";

// Properly typed PrismaClient helper
// PrismaService extends PrismaClient, but TypeScript needs explicit casting for type inference
// This type allows accessing PrismaClient methods while maintaining type safety
export type PrismaClientLike = PrismaService & PrismaClient;

// User with roles relation type
export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: true;
      };
    };
  };
}>;

// User with roles and departments relation type (for auth)
export type UserWithRolesAndDepartments = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: true;
      };
    };
    departments: {
      include: {
        department: true;
      };
    };
  };
}>;
