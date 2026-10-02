import { Module } from '@nestjs/common';
import { ALERT_SERVICE } from './alert-service';
import { ConsoleAlertService } from './console-alert.service';
@Module({ providers: [ConsoleAlertService, { provide: ALERT_SERVICE, useExisting: ConsoleAlertService }], exports: [ALERT_SERVICE] })
export class AlertsModule {}
