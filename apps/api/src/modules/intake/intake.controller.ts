import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { IsString, IsEmail, IsNotEmpty, MaxLength, validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IntakeService, WEB_FORM_CATEGORIES } from './intake.service';

/**
 * Validated DTO for the public web form endpoint.
 * No auth required — rate-limited at 10 requests/hour per IP.
 */
class CreatePublicRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  requesterName!: string;

  @IsEmail()
  @MaxLength(255)
  requesterEmail!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description!: string;
}

/**
 * IntakeController — public REST endpoints for external ticket submission.
 *
 * POST /api/v1/request
 *   No authentication. Rate-limited per IP. Validates input. Creates ticket
 *   with source = SELF_SERVICE and enqueues acknowledgement email.
 */
@Controller('api/v1')
export class IntakeController {
  constructor(@Inject(IntakeService) private readonly intake: IntakeService) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async submitRequest(
    @Body() body: Record<string, unknown>,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    // Resolve real IP (behind proxy)
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';

    // Rate limit check
    const allowed = await this.intake.checkRateLimit(ip);
    if (!allowed) {
      res.status(429);
      return { error: 'Too many requests. Please try again later.' };
    }

    // Validate and transform DTO
    const dto = plainToInstance(CreatePublicRequestDto, body);
    try {
      await validateOrReject(dto);
    } catch (errors) {
      throw new BadRequestException({ message: 'Validation failed', errors });
    }

    // Category whitelist check
    if (!WEB_FORM_CATEGORIES.includes(dto.category as (typeof WEB_FORM_CATEGORIES)[number])) {
      throw new BadRequestException(
        `Category must be one of: ${WEB_FORM_CATEGORIES.join(', ')}`,
      );
    }

    const result = await this.intake.createFromWebForm({
      tenantId: dto.tenantId,
      requesterName: dto.requesterName,
      requesterEmail: dto.requesterEmail,
      category: dto.category,
      subject: dto.subject,
      description: dto.description,
    });

    return {
      ticketRef: result.ticketRef,
      message:
        `Your request has been received (${result.ticketRef}). ` +
        `We will be in touch shortly.`,
    };
  }
}
