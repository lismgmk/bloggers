import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BlackListRepository } from '../modules/auth/black-list.repository';
import { JwtPassService } from '../modules/common-services/jwt-pass/jwt-pass.service';
import { UsersRepository } from '../modules/users/users.repository';

@Injectable()
export class CookieGuard implements CanActivate {
  constructor(
    private blackListRepository: BlackListRepository,
    private jwtPassService: JwtPassService,
    private usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<any> {
    const request = context.switchToHttp().getRequest();
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const isChecked = await this.blackListRepository.checkToken(refreshToken);
    const payload = this.jwtPassService.decodeJwt(refreshToken) as {
      id: string;
      deviceId: string;
      iat: string;
      exp: string;
    };
    const user = await this.usersRepository.getUserById(payload.id);

    if (
      isChecked.length > 0 ||
      !this.jwtPassService.verifyJwt(refreshToken) ||
      !user
    ) {
      throw new UnauthorizedException();
    }

    request.deviceId = payload.deviceId;
    request.user = user;
    return true;
  }
}
