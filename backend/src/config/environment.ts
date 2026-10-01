import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';

// All entry points use Nest's standard .env loader at the repository root.
// Existing process environment variables take precedence over .env values.
export const environmentModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: resolve(__dirname, '../../../.env'),
});
