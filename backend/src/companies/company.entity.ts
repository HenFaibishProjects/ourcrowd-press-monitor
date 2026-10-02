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

  @CreateDateColumn({ type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}
