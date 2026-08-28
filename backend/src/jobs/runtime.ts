import crypto from 'node:crypto';
import os from 'node:os';
import { JobRunner } from './JobRunner.js';
import { prismaJobLeaseRepository } from './lease/PrismaJobLeaseRepository.js';
import { createJobDefinitions } from './registry.js';
import { WorkerScheduler } from './WorkerScheduler.js';

export function createJobOwnerId(runtime: 'api' | 'worker') {
  const hostname = os.hostname().slice(0, 80);
  return `${runtime}:${hostname}:${process.pid}:${crypto.randomUUID()}`;
}

export function createJobScheduler(runtime: 'api' | 'worker') {
  const definitions = createJobDefinitions().filter((job) => job.runtime === runtime);
  const runner = new JobRunner(prismaJobLeaseRepository, createJobOwnerId(runtime));
  return new WorkerScheduler(definitions, runner);
}
