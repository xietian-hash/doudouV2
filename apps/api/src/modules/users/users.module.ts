import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserInitService } from './user-init.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserInitService],
  exports: [UsersService, UserInitService],
})
export class UsersModule {}
