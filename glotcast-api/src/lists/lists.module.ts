import { Module } from "@nestjs/common"
import { UsersModule } from "../users/users.module"
import { ListsController } from "./lists.controller"
import { ListsRepository } from "./lists.repository"
import { ListsService } from "./lists.service"

@Module({
  imports: [UsersModule],
  controllers: [ListsController],
  providers: [ListsRepository, ListsService],
  exports: [ListsRepository],
})
export class ListsModule {}
