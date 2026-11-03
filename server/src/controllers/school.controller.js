const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { readSettings } = require('../services/settings.service');
const { schoolSettingSchema, parse } = require('../validation/schemas');

/** GET /api/settings/public — unauthenticated school copy for the landing page. */
const publicSettings = asyncHandler(async (_req, res) => {
  const settings = await readSettings();
  res.json({ success: true, data: { settings } });
});

/** GET /api/admin/settings — full settings for the design editor. */
const adminSettings = asyncHandler(async (_req, res) => {
  const settings = await readSettings();
  res.json({ success: true, data: { settings } });
});

/** PATCH /api/admin/settings */
const updateSettings = asyncHandler(async (req, res) => {
  const data = parse(schoolSettingSchema, req.body);
  const settings = await prisma.schoolSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...data },
    update: data,
  });

  res.json({ success: true, data: { settings } });
});

module.exports = { publicSettings, adminSettings, updateSettings };
