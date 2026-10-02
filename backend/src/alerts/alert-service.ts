import { Mention } from '../mentions/mention.entity';
export const ALERT_SERVICE = Symbol('ALERT_SERVICE');
export interface NewMentionAlert { companyName: string; mention: Mention }
export interface AlertService {
  sendNewMentions(mentions: NewMentionAlert[]): Promise<void>;
}
