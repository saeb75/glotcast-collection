import { Module } from "@nestjs/common"
import { AdminRolesService } from "./admin-roles.service"
import { AdminAuditRepository } from "./audit/audit.repository"

/** CLI only: `admin grant | revoke | list` (role changes are written to the admin audit log). */
@Module({ providers: [AdminRolesService, AdminAuditRepository], exports: [AdminRolesService] })
export class AdminRolesModule {}
