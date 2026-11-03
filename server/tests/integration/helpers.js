import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

export const request = nodeRequire('supertest');
export const app = nodeRequire('../../src/app.js');
export const prisma = nodeRequire('../../src/config/prisma.js');

export const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Registers nothing — integration specs log in with seeded accounts. */
export const signIn = async (email, password = 'aurora123') => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
};

/** Deletes an integration-created student (and its dependent rows) by admission number. */
export const removeStudent = async (admissionNo) => {
  const student = await prisma.student.findUnique({ where: { admissionNo } });
  if (student) {
    await prisma.student.delete({ where: { id: student.id } });
  }
};
