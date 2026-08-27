import 'dotenv/config';
import { hasFlag, parseCliArgs, requiredString } from './cli.mjs';
import { assertOperationalEnvironment } from './environmentGuard.mjs';

const parsed = parseCliArgs(process.argv.slice(2));
const targetEnvironment = requiredString(parsed, 'Ambiente alvo', 'environment');

assertOperationalEnvironment({
  targetEnvironment,
  allowProduction: hasFlag(parsed, 'allow-production'),
});
