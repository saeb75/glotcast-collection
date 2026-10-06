import { Module } from "@nestjs/common"
import { ListsModule } from "../lists/lists.module"
import { MeModule } from "../me/me.module"
import { UsersModule } from "../users/users.module"
import { HomeController } from "./home.controller"
import { HomeRepository } from "./home.repository"
import { HomeService } from "./home.service"

@Module({
  imports: [UsersModule, ListsModule, MeModule],
  controllers: [HomeController],
  providers: [HomeRepository, HomeService],
  exports: [HomeRepository],
})
export class HomeModule {}
