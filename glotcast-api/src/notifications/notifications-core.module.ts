import { Module } from "@nestjs/common"
import { CampaignExpander } from "./campaign-expander.service"
import { ContentService } from "./content.service"
import { DispatcherService } from "./dispatcher.service"
import { NotificationEvents } from "./events.service"
import { JobLeases } from "./leases"
import { NotifyCliService } from "./notify-cli.service"
import { OneSignalClient } from "./onesignal.client"
import { PlannerService } from "./planner.service"
import { NotificationsScheduler } from "./scheduler"
import { SendsRepository } from "./sends.repository"
import { NotificationSettingsService } from "./settings.service"
import { TestSendService } from "./test-send.service"

/**
 * Push notifications: the API decides who gets which push and when (planner, content, campaigns), OneSignal only
 * delivers (dispatcher). The scheduler's cron runs where ScheduleModule.forRoot() is imported (the API server);
 * the CLI uses the same services for `notify …`.
 */
@Module({
  providers: [
    OneSignalClient,
    NotificationSettingsService,
    JobLeases,
    SendsRepository,
    PlannerService,
    ContentService,
    CampaignExpander,
    DispatcherService,
    NotificationsScheduler,
    NotificationEvents,
    TestSendService,
    NotifyCliService,
  ],
  exports: [
    OneSignalClient,
    NotificationSettingsService,
    JobLeases,
    PlannerService,
    ContentService,
    CampaignExpander,
    DispatcherService,
    NotificationsScheduler,
    NotificationEvents,
    TestSendService,
    NotifyCliService,
  ],
})
export class NotificationsCoreModule {}
