import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { IsString, IsEmail, IsNotEmpty, IsOptional, MaxLength, validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { getMssqlPool } from '@lotris/db';
import { randomUUID } from 'crypto';

class RequestAccessDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  companyName!: string;

  @IsEmail() @MaxLength(255)
  email!: string;

  @IsOptional() @IsString() @MaxLength(1000)
  message?: string;
}

@Controller('api/v1/request-access')
export class AccessRequestController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submit(@Body() body: unknown) {
    const dto = plainToInstance(RequestAccessDto, body);
    try {
      await validateOrReject(dto);
    } catch {
      throw new BadRequestException('Invalid request data');
    }

    const pool = await getMssqlPool();
    await pool
      .request()
      .input('id', randomUUID())
      .input('name', dto.name)
      .input('company', dto.companyName)
      .input('email', dto.email)
      .input('message', dto.message ?? null)
      .query(`
        INSERT INTO AccessRequests (id, name, company_name, email, message)
        VALUES (@id, @name, @company, @email, @message)
      `);

    return { success: true };
  }
}
