import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790856000000 implements MigrationInterface {
  name = 'InitialSchema1790856000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" SERIAL NOT NULL,
        "name" text NOT NULL,
        "domain" text,
        "sector" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CHK_company_name" CHECK (length(trim("name")) > 0),
        CONSTRAINT "PK_companies_id" PRIMARY KEY ("id")
      )
    `);
    
    await queryRunner.query(`
      CREATE TABLE "mentions" (
        "id" SERIAL NOT NULL,
        "companyId" integer NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "url" text NOT NULL,
        "source" text NOT NULL,
        "publishedAt" TIMESTAMP NOT NULL,
        "sentiment" text NOT NULL,
        "discoveredAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CHK_mention_sentiment" CHECK ("sentiment" IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
        CONSTRAINT "UQ_mention_company_url" UNIQUE ("companyId", "url"),
        CONSTRAINT "PK_mentions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_mention_company_published" ON "mentions" ("companyId", "publishedAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "mentions" ADD CONSTRAINT "FK_mention_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mentions" DROP CONSTRAINT "FK_mention_company"`);
    await queryRunner.query(`DROP INDEX "IDX_mention_company_published"`);
    await queryRunner.query(`DROP TABLE "mentions"`);
    await queryRunner.query(`DROP TABLE "companies"`);
  }
}
