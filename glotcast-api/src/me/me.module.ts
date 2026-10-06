import { Module } from "@nestjs/common"
import { UsersModule } from "../users/users.module"
import { MeController } from "./me.controller"
import { MeRepository } from "./me.repository"
import { MeService } from "./me.service"
import { ProgressRepository } from "./progress.repository"
import { Timezones } from "./timezones"

@Module({
  imports: [UsersModule],
  controllers: [MeController],
  providers: [MeRepository, MeService, ProgressRepository, Timezones],
  exports: [MeService, MeRepository, ProgressRepository],
})
export class MeModule {}
