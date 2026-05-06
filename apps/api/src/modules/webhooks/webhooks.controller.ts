import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Webhook } from 'svix';
import { getEnv } from '@lotris/config';
import { WebhooksService } from './webhooks.service';

@Controller('api/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Receives Clerk webhook events.
   * Verifies the svix signature before processing.
   * Endpoint must be registered in Clerk Dashboard → Webhooks.
   */
  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  async handleClerkWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) throw new BadRequestException('Missing raw body');

    const wh = new Webhook(getEnv().CLERK_WEBHOOK_SECRET);

    let event: { type: string; data: Record<string, unknown> };
    try {
      event = wh.verify(rawBody.toString(), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as typeof event;
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'user.created':
        await this.webhooksService.onUserCreated(event.data);
        break;
      case 'user.updated':
        await this.webhooksService.onUserUpdated(event.data);
        break;
      case 'organization.created':
        await this.webhooksService.onOrgCreated(event.data);
        break;
      case 'organizationMembership.created':
        await this.webhooksService.onMembershipCreated(event.data);
        break;
      default:
        // Unhandled event type — acknowledged, not processed
        break;
    }

    return { received: true };
  }
}
