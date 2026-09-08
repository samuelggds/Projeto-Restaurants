import { validateCriticalEnv } from './validateEnv.js';
import { assertSafeRuntimeDatabaseEnvironment } from './runtimeDatabaseEnvironment.js';

assertSafeRuntimeDatabaseEnvironment();
validateCriticalEnv();
