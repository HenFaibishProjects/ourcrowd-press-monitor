import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790856000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "companies" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "name" text NOT NULL,
      "domain" text,
      "sector" text,
      "createdAt" datetime NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
      "updatedAt" datetime NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
      CONSTRAINT "CHK_company_name" CHECK (length(trim("name")) > 0)
    )`);
    await queryRunner.query(`CREATE TABLE "mentions" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "companyId" integer NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "url" text NOT NULL,
      "source" text NOT NULL,
      "publishedAt" datetime NOT NULL,
      "sentiment" text NOT NULL,
      "discoveredAt" datetime NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
      CONSTRAINT "UQ_mention_company_url" UNIQUE ("companyId", "url"),
      CONSTRAINT "CHK_mention_sentiment" CHECK ("sentiment" IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
      CONSTRAINT "FK_mention_company" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query('CREATE INDEX "IDX_mention_company_published" ON "mentions" ("companyId", "publishedAt")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "mentions"');
    await queryRunner.query('DROP TABLE "companies"');
  }
}
