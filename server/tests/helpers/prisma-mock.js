import { vi } from 'vitest';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

const PRISMA_PATH = nodeRequire.resolve('../../src/config/prisma.js');

// School domain: every model the API touches, with the query methods used.
const model = () => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  createMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
  upsert: vi.fn(),
  aggregate: vi.fn(),
  groupBy: vi.fn(),
});

/**
 * Builds a stand-in for the Prisma client. Every model exposes the query methods
 * the API actually uses so specs can assert on calls without a live database.
 */
export const createPrismaMock = () => ({
  user: model(),
  staffProfile: model(),
  academicYear: model(),
  schoolClass: model(),
  section: model(),
  subject: model(),
  classSubject: model(),
  subjectAssignment: model(),
  student: model(),
  guardian: model(),
  attendance: model(),
  exam: model(),
  examSubject: model(),
  mark: model(),
  feeStructure: model(),
  feeInvoice: model(),
  payment: model(),
  timetableSlot: model(),
  notice: model(),
  event: model(),
  book: model(),
  bookIssue: model(),
  route: model(),
  stop: model(),
  vehicle: model(),
  studentTransport: model(),
  schoolSetting: model(),
  message: model(),
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
});

/**
 * The API is CommonJS, so `vi.mock` cannot intercept the `require()` calls
 * inside controllers. Seeding `require.cache` before the app is loaded does
 * work, and keeps every spec runnable without a MySQL instance.
 */
export const installPrismaMock = (mock) => {
  nodeRequire.cache[PRISMA_PATH] = {
    id: PRISMA_PATH,
    filename: PRISMA_PATH,
    loaded: true,
    exports: mock,
    children: [],
    paths: nodeRequire.cache[PRISMA_PATH]?.paths || [],
  };

  return mock;
};

const resetDeep = (node) => {
  Object.values(node).forEach((value) => {
    if (value && typeof value.mockReset === 'function') value.mockReset();
    else if (value && typeof value === 'object') resetDeep(value);
  });
};

/** Returns every mock to a clean slate without losing the database health check. */
export const resetPrisma = (prisma) => {
  resetDeep(prisma);
  prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  prisma.$connect.mockResolvedValue(undefined);
  prisma.$disconnect.mockResolvedValue(undefined);

  // Interactive transactions receive a transaction client that shares the
  // same model mocks, so a spec can assert on the writes it performs.
  prisma.$transaction.mockImplementation(async (callback) => {
    if (Array.isArray(callback)) {
      // Batched transactions resolve to the array of results.
      return Promise.all(callback);
    }
    if (typeof callback !== 'function') return callback;
    return callback(prisma);
  });
};

export { nodeRequire };
