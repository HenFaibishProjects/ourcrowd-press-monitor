import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('companies')
@Check('CHK_company_name', 'length(trim("name")) > 0')
export class Company {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  domain!: string | null;

  @Column({ type: 'text', nullable: true })
  sector!: string | null;

  @CreateDateColumn({ type: 'datetime', default: () => "strftime('%Y-%m-%d %H:%M:%f', 'now')" })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => "strftime('%Y-%m-%d %H:%M:%f', 'now')" })
  updatedAt!: Date;
}
