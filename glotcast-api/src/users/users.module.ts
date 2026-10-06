import { Module } from "@nestjs/common"
import { AppConfig } from "../config/app-config.service"
import { AUTH_KEYS, AuthVerifier, supabaseKeys } from "../auth/auth-verifier"
import { AuthGuard, OptionalAuthGuard } from "../auth/auth.guard"
import { LegacyImportService } from "./legacy-import.service"
import { SupabaseAdmin } from "./supabase-admin"
import { UsersService } from "./users.service"

/** Who is calling: token verification, provisioning, account deletion, guest + legacy claims. */
@Module({
  providers: [
    { provide: AUTH_KEYS, inject: [AppConfig], useFactory: supabaseKeys },
    AuthVerifier,
    SupabaseAdmin,
    LegacyImportService,
    UsersService,
    AuthGuard,
    OptionalAuthGuard,
  ],
  exports: [AuthVerifier, UsersService, LegacyImportService, AuthGuard, OptionalAuthGuard],
})
export class UsersModule {}
