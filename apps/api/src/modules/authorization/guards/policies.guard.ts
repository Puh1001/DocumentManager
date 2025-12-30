import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CaslAbilityFactory } from "../factories/casl-ability.factory";
import {
  CHECK_POLICIES_KEY,
  PolicyHandler,
} from "../decorators/check-policies.decorator";
import { AuthenticatedRequest } from "@/common/types/request.types";
import { PrismaService } from "@/common/prisma/prisma.service";
import { AppAbility, Document, Folder } from "../types/ability.types";

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers = this.reflector.getAllAndOverride<PolicyHandler[]>(
      CHECK_POLICIES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!policyHandlers || policyHandlers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    const ability = await this.caslAbilityFactory.createForUser(
      user.id,
      user.roles || []
    );

    const results = await Promise.all(
      policyHandlers.map((handler) =>
        this.execPolicyHandler(handler, ability, request)
      )
    );
    return results.every((result) => result === true);
  }

  private async execPolicyHandler(
    handler: PolicyHandler,
    ability: AppAbility,
    request: AuthenticatedRequest
  ): Promise<boolean> {
    const { action, subject } = handler;

    // For "all" subject, check directly
    const subjectStr = subject as string;
    if (subjectStr === "all") {
      return ability.can(action, "all");
    }

    // Check manage:all first (admin has full access)
    if (ability.can("manage", "all")) {
      return true;
    }

    // Extract resource ID from route params
    const resourceId = request.params?.id;
    if (!resourceId) {
      // For create operations, check if user can create in the folder
      if (
        subject === "Document" &&
        (request.body?.folderId || request.query?.folderId)
      ) {
        const folderId = request.body?.folderId || request.query?.folderId;
        const folder = await this.prisma.folder.findUnique({
          where: { id: folderId },
        });
        if (folder) {
          const documentSubject: Document = {
            id: "",
            folderId: folder.id,
          };
          return ability.can(action, documentSubject);
        }
      }
      // For folder create, check general create permission
      if (subject === "Folder") {
        return (
          ability.can(action, "Folder") ||
          ability.can("manage", "Folder")
        );
      }
      // For string subjects (like "Maintenance", "User", etc.), check manage:subject or action:subject
      if (typeof subject === "string") {
        return (
          ability.can(action, subject) ||
          ability.can("manage", subject)
        );
      }
      return false;
    }

    // Fetch the resource and check permissions
    if (subject === "Document" && resourceId) {
      const document = await this.prisma.document.findUnique({
        where: { id: resourceId },
        select: { id: true, folderId: true },
      });
      if (!document) {
        return false;
      }
      const documentSubject: Document = {
        id: document.id,
        folderId: document.folderId,
      };
      return ability.can(action, documentSubject);
    }

    if (subject === "Folder" && resourceId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: resourceId },
        select: { id: true },
      });
      if (!folder) {
        return false;
      }
      const folderSubject: Folder = { id: folder.id };
      return ability.can(action, folderSubject);
    }

    // Fallback: check with conditions from handler
    if (handler.conditions) {
      // For string subjects, check directly
      if (typeof subject === "string") {
        return (
          ability.can(action, subject) ||
          ability.can("manage", subject)
        );
      }
      return false;
    }

    // Final fallback: check string subjects (for module permissions like "Maintenance", "User", etc.)
    if (typeof subject === "string") {
      return (
        ability.can(action, subject) ||
        ability.can("manage", subject)
      );
    }

    return false;
  }
}
