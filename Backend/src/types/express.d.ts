import { OrgMembership } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      membership?: OrgMembership;
      apiTokenId?: string;
      apiTokenOrgId?: string;
    }
  }
}

export {};
