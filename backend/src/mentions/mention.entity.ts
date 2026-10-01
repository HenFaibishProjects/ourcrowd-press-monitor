import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Sentiment } from './sentiment.enum';

@Entity('mentions')
@Unique('UQ_mention_company_url', ['companyId', 'url'])
@Index('IDX_mention_company_published', ['companyId', 'publishedAt'])
@Check('CHK_mention_sentiment', `"sentiment" IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')`)
export class Mention {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  companyId!: number;

  @ManyToOne(() => Company, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId', foreignKeyConstraintName: 'FK_mention_company' })
  company!: Company;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'text' })
  source!: string;

  @Column({ type: 'datetime' })
  publishedAt!: Date;

  @Column({ type: 'text' })
  sentiment!: Sentiment;

  @CreateDateColumn({ type: 'datetime', default: () => "strftime('%Y-%m-%d %H:%M:%f', 'now')" })
  discoveredAt!: Date;
}
