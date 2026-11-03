const prisma = require('../config/prisma');

const defaultSettings = {
  id: 'default',
  schoolName: 'Aurora School',
  tagline: 'Learn. Lead. Shine.',
  announcement: 'Admission open for 2026–2027',
  heroDescription:
    "A nurturing school for grades 1 to 10 — qualified teachers, modern labs, live progress tracking and safe transport, all the way to your child's report card.",
  phone: '+880 1700-000000',
  email: 'info@aurora.school',
  address: '12 School Road, Dhaka 1205',
  principal: 'Ayesha Rahman',
  establishedYear: 1998,
};

const withDefaults = (settings) => ({ ...defaultSettings, ...(settings || {}) });

/** Fetch the singleton settings row, tolerating an empty table. */
const readSettings = async () => {
  const settings = await prisma.schoolSetting.findUnique({ where: { id: 'default' } });
  return withDefaults(settings);
};

module.exports = { defaultSettings, readSettings, withDefaults };
