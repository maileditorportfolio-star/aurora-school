import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, superAdmin, admin, restrictedAdmin, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const baseSettings = {
  id: 'default',
  schoolName: 'Aurora School',
  tagline: 'Learn. Lead. Shine.',
  announcement: 'Admission open',
  heroDescription: 'A nurturing school',
  phone: '+880 1700-000000',
  email: 'info@aurora.school',
  address: '12 School Road, Dhaka 1205',
  principal: 'Ayesha Rahman',
  establishedYear: 1998,
};

describe('GET /api/settings/public', () => {
  beforeEach(() => reset());

  it('returns the settings without authentication', async () => {
    prisma.schoolSetting.findUnique.mockResolvedValue(baseSettings);

    const res = await request(app).get('/api/settings/public');

    expect(res.status).toBe(200);
    expect(res.body.data.settings.schoolName).toBe('Aurora School');
  });

  it('falls back to defaults when the table is empty', async () => {
    prisma.schoolSetting.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/settings/public');

    expect(res.status).toBe(200);
    expect(res.body.data.settings.schoolName).toBe('Aurora School');
    expect(res.body.data.settings.establishedYear).toBe(1998);
  });
});

describe('PATCH /api/admin/settings', () => {
  beforeEach(() => reset());

  it('updates the school profile for a super admin', async () => {
    const token = signIn(superAdmin);
    prisma.schoolSetting.upsert.mockResolvedValue({
      ...baseSettings,
      announcement: 'Half day on Thursday',
    });

    const res = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', token)
      .send({ announcement: 'Half day on Thursday' });

    expect(res.status).toBe(200);
    expect(prisma.schoolSetting.upsert.mock.calls[0][0].update.announcement).toBe(
      'Half day on Thursday',
    );
  });

  it('rejects an admin without settings.write', async () => {
    const token = signIn(restrictedAdmin); // only fees.write

    const res = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', token)
      .send({ announcement: 'Sneaky edit' });

    expect(res.status).toBe(403);
    expect(prisma.schoolSetting.upsert).not.toHaveBeenCalled();
  });

  it('allows an admin with settings.write', async () => {
    const permitted = { ...admin, permissions: [...admin.permissions, 'settings.write'] };
    const token = signIn(permitted);
    prisma.schoolSetting.upsert.mockResolvedValue({ ...baseSettings, tagline: 'Inspire. Excel.' });

    const res = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', token)
      .send({ tagline: 'Inspire. Excel.' });

    expect(res.status).toBe(200);
  });
});
