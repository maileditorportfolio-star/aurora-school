/* eslint-disable no-console */
/**
 * Aurora School — idempotent demo seed.
 * Safe to re-run: seeded rows are keyed by natural unique values and rebuilt
 * deterministically; hand-created data with other identifiers is left alone.
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Deterministic pseudo-random generator so re-seeds produce the same data.
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const random = mulberry32(20261103);

const PASSWORD =
  process.env.SEED_DEMO_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'aurora123');
if (!PASSWORD) throw new Error('SEED_DEMO_PASSWORD must be set in production');

const SUBJECTS = [
  { name: 'Bangla', code: 'BAN101' },
  { name: 'English', code: 'ENG101' },
  { name: 'Mathematics', code: 'MAT101' },
  { name: 'Science', code: 'SCI101' },
  { name: 'ICT', code: 'ICT101' },
  { name: 'Religion & Values', code: 'REL101' },
  { name: 'Social Studies', code: 'SOC101' },
];

const CLASSES = Array.from({ length: 10 }, (_, index) => ({
  name: `Grade ${index + 1}`,
  order: index + 1,
}));

const TEACHERS = [
  {
    name: 'Ayesha Rahman',
    email: 'ayesha@aurora.school',
    designation: 'Head Teacher',
    qualification: 'M.Ed, University of Dhaka',
    subjects: ['BAN101', 'SOC101'],
  },
  {
    name: 'Arif Hossain',
    email: 'arif@aurora.school',
    designation: 'Senior Teacher',
    qualification: 'M.Sc Mathematics, DU',
    subjects: ['MAT101'],
  },
  {
    name: 'Nusrat Jahan',
    email: 'nusrat@aurora.school',
    designation: 'Senior Teacher',
    qualification: 'M.A English, DU',
    subjects: ['ENG101'],
  },
  {
    name: 'Rashedul Islam',
    email: 'rashed@aurora.school',
    designation: 'Teacher',
    qualification: 'B.Sc, BUET (ICT)',
    subjects: ['ICT101', 'SCI101'],
  },
  {
    name: 'Farhana Akter',
    email: 'farhana@aurora.school',
    designation: 'Teacher',
    qualification: 'M.Sc Chemistry',
    subjects: ['SCI101'],
  },
  {
    name: 'Sumon Chowdhury',
    email: 'sumon@aurora.school',
    designation: 'Teacher',
    qualification: 'M.A Islamic Studies',
    subjects: ['REL101', 'BAN101'],
  },
  {
    name: 'Tanvir Ahmed',
    email: 'tanvir@aurora.school',
    designation: 'Teacher',
    qualification: 'B.A Social Science',
    subjects: ['SOC101', 'ENG101'],
  },
  {
    name: 'Mim Akter',
    email: 'mim@aurora.school',
    designation: 'Teacher',
    qualification: 'M.Sc Mathematics',
    subjects: ['MAT101', 'ICT101'],
  },
];

const FIRST_MALE = [
  'Rafi',
  'Sakib',
  'Naim',
  'Fahim',
  'Arif',
  'Mahin',
  'Tanzim',
  'Joy',
  'Siam',
  'Riyad',
  'Emon',
  'Anik',
  'Sajid',
  'Tanvir',
  'Rabby',
];
const FIRST_FEMALE = [
  'Nusaiba',
  'Maliha',
  'Sumaiya',
  'Fariha',
  'Tasnim',
  'Raisa',
  'Misty',
  'Priya',
  'Mim',
  'Anika',
  'Lamia',
  'Sylvi',
  'Trisha',
  'Mahi',
  'Ishrat',
];
const LAST = [
  'Rahman',
  'Islam',
  'Hasan',
  'Chowdhury',
  'Ahmed',
  'Khan',
  'Mia',
  'Sheikh',
  'Das',
  'Barua',
];

const studentsFor = () => {
  const rows = [];
  const between = (a, b) => Math.floor(random() * (b - a + 1)) + a;
  for (let i = 0; i < 10; i += 1) {
    const gender = i % 2 === 0 ? 'MALE' : 'FEMALE';
    const firstName =
      gender === 'MALE'
        ? FIRST_MALE[(i * 7 + between(0, 9)) % FIRST_MALE.length]
        : FIRST_FEMALE[(i * 5 + between(0, 9)) % FIRST_FEMALE.length];
    const lastName = LAST[(i * 3 + between(0, 9)) % LAST.length];
    rows.push({ firstName, lastName, gender, rollNumber: i + 1 });
  }
  return rows;
};

const upsertUser = async ({ email, name, role, phone, permissions, password = PASSWORD }) => {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role,
      phone: phone || null,
      permissions: permissions || undefined,
      passwordHash,
    },
    update: { name, phone: phone || null, ...(permissions ? { permissions } : {}) },
  });
};

const main = async () => {
  console.log('Seeding Aurora School…');

  // --- Academic year ------------------------------------------------------
  const year = await prisma.academicYear.upsert({
    where: { name: '2026-2027' },
    create: {
      name: '2026-2027',
      startDate: new Date('2026-01-05'),
      endDate: new Date('2026-12-15'),
      isCurrent: true,
    },
    update: { isCurrent: true },
  });
  await prisma.academicYear.updateMany({
    where: { NOT: { id: year.id } },
    data: { isCurrent: false },
  });

  // --- Classes, sections, subjects ---------------------------------------
  const classRows = [];
  for (const cls of CLASSES) {
    const row = await prisma.schoolClass.upsert({
      where: { name: cls.name },
      create: cls,
      update: { order: cls.order },
    });
    classRows.push(row);
    for (const sectionName of ['A', 'B']) {
      await prisma.section.upsert({
        where: { classId_name: { classId: row.id, name: sectionName } },
        create: { classId: row.id, name: sectionName },
        update: {},
      });
    }
  }

  const subjectRows = [];
  for (const subject of SUBJECTS) {
    const row = await prisma.subject.upsert({
      where: { code: subject.code },
      create: subject,
      update: { name: subject.name },
    });
    subjectRows.push(row);
  }
  const subjectByCode = new Map(subjectRows.map((row) => [row.code, row]));

  for (const cls of classRows) {
    for (const subject of subjectRows) {
      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId: cls.id, subjectId: subject.id } },
        create: { classId: cls.id, subjectId: subject.id },
        update: {},
      });
    }
  }

  // --- Accounts ------------------------------------------------------------
  const superAdmin = await upsertUser({
    email: 'admin@aurora.school',
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
    phone: '+880 1700-000001',
  });
  const { ALL_PERMISSIONS } = require('../src/permissions');
  const office = await upsertUser({
    email: 'office@aurora.school',
    name: 'Office Admin',
    role: 'ADMIN',
    phone: '+880 1700-000002',
    permissions: ALL_PERMISSIONS,
  });

  const teacherRows = [];
  for (const [index, teacher] of TEACHERS.entries()) {
    const user = await upsertUser({
      email: teacher.email,
      name: teacher.name,
      role: 'TEACHER',
      phone: `+880 1${700 + index}-0000${String(10 + index)}`,
    });
    const profile = await prisma.staffProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        employeeNo: `EMP-${String(index + 1).padStart(4, '0')}`,
        designation: teacher.designation,
        qualification: teacher.qualification,
        joiningDate: new Date(2021 + (index % 4), index % 12, 15),
      },
      update: { designation: teacher.designation, qualification: teacher.qualification },
    });
    teacherRows.push({ ...user, teacher, profile });
  }
  const teacherByEmail = new Map(teacherRows.map((row) => [row.email, row]));

  // --- Subject assignments (class-wide) for Grade 6 and 7 -------------------
  const grade6 = classRows.find((row) => row.name === 'Grade 6');
  const grade7 = classRows.find((row) => row.name === 'Grade 7');
  for (const targetClass of [grade6, grade7]) {
    for (const subject of SUBJECTS) {
      const teacher = TEACHERS.find((row) => row.subjects.includes(subject.code));
      const teacherUser = teacher ? teacherByEmail.get(teacher.email) : teacherRows[0];
      const existing = await prisma.subjectAssignment.findFirst({
        where: {
          classId: targetClass.id,
          sectionId: null,
          subjectId: subjectByCode.get(subject.code).id,
        },
      });
      if (existing) {
        await prisma.subjectAssignment.update({
          where: { id: existing.id },
          data: { teacherId: teacherUser.id },
        });
      } else {
        await prisma.subjectAssignment.create({
          data: {
            classId: targetClass.id,
            sectionId: null,
            subjectId: subjectByCode.get(subject.code).id,
            teacherId: teacherUser.id,
          },
        });
      }
    }
  }

  // --- Students ---------------------------------------------------------------
  const seededAdmissionNos = [];
  let admissionCounter = 1;
  const studentTargets = [
    { classRow: grade6, sectionName: 'A' },
    { classRow: grade6, sectionName: 'B' },
    { classRow: grade7, sectionName: 'A' },
    { classRow: grade7, sectionName: 'B' },
  ];

  for (const target of studentTargets) {
    const section = await prisma.section.findUnique({
      where: { classId_name: { classId: target.classRow.id, name: target.sectionName } },
    });
    const rows = studentsFor();
    for (const row of rows) {
      const admissionNo = `ADV-2026-${String(admissionCounter).padStart(4, '0')}`;
      admissionCounter += 1;
      seededAdmissionNos.push(admissionNo);

      const student = await prisma.student.upsert({
        where: { admissionNo },
        create: {
          admissionNo,
          firstName: row.firstName,
          lastName: row.lastName,
          gender: row.gender,
          dateOfBirth: new Date(
            2013 + (row.gender === 'MALE' ? 0 : 0),
            (row.rollNumber * 2) % 12,
            14,
          ),
          bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'O-'][row.rollNumber % 5],
          religion: row.rollNumber % 3 === 0 ? 'Hindu' : 'Islam',
          address: `House ${10 + row.rollNumber}, Road ${3 + (row.rollNumber % 8)}, Dhaka`,
          admissionDate: new Date('2026-01-05'),
          rollNumber: row.rollNumber,
          sectionId: section.id,
          status: 'ACTIVE',
        },
        update: {
          firstName: row.firstName,
          lastName: row.lastName,
          sectionId: section.id,
          rollNumber: row.rollNumber,
        },
      });

      // Rebuild guardians for the seeded student (idempotent).
      await prisma.guardian.deleteMany({ where: { studentId: student.id } });
      await prisma.guardian.create({
        data: {
          studentId: student.id,
          name: `${row.firstName}'s Father`,
          relation: 'FATHER',
          phone: `+880 17${String(10 + row.rollNumber).slice(-2)}-${String(100000 + admissionCounter * 13).slice(-6)}`,
          isPrimary: true,
        },
      });
    }
  }

  // Link demo portal accounts: one student, one parent with two children.
  const firstStudent = await prisma.student.findFirst({ where: { admissionNo: 'ADV-2026-0001' } });
  const secondStudent = await prisma.student.findFirst({ where: { admissionNo: 'ADV-2026-0002' } });
  const studentUser = await upsertUser({
    email: 'student@aurora.school',
    name: `${firstStudent.firstName} ${firstStudent.lastName}`,
    role: 'STUDENT',
  });
  await prisma.student.update({ where: { id: firstStudent.id }, data: { userId: studentUser.id } });

  const parentUser = await upsertUser({
    email: 'parent@aurora.school',
    name: 'Demo Parent',
    role: 'PARENT',
    phone: '+880 1700-000003',
  });
  for (const child of [firstStudent, secondStudent]) {
    await prisma.guardian.updateMany({
      where: { studentId: child.id, isPrimary: true },
      data: { userId: parentUser.id, email: 'parent@aurora.school' },
    });
  }

  // --- Attendance: last 20 weekdays present/absent pattern -----------------
  const section6A = await prisma.section.findFirst({
    where: { name: 'A', schoolClass: { name: 'Grade 6' } },
  });
  const attendanceStudents = await prisma.student.findMany({ where: { sectionId: section6A.id } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let dayCursor = new Date(today);
  const attendanceDays = [];
  while (attendanceDays.length < 20) {
    const day = dayCursor.getDay();
    if (day !== 5 && day !== 6) attendanceDays.push(new Date(dayCursor)); // skip Fri/Sat
    dayCursor.setDate(dayCursor.getDate() - 1);
  }
  for (const student of attendanceStudents) {
    for (const date of attendanceDays) {
      const roll = student.rollNumber || 1;
      const absent = (date.getDate() + roll) % 11 === 0;
      const late = !absent && (date.getDate() + roll) % 17 === 0;
      await prisma.attendance.upsert({
        where: { studentId_date: { studentId: student.id, date } },
        create: {
          studentId: student.id,
          date,
          status: absent ? 'ABSENT' : late ? 'LATE' : 'PRESENT',
        },
        update: { status: absent ? 'ABSENT' : late ? 'LATE' : 'PRESENT' },
      });
    }
  }

  // --- Fees -------------------------------------------------------------------
  const tuition = await prisma.feeStructure.upsert({
    where: { id: 'seed-tuition' },
    create: {
      id: 'seed-tuition',
      name: 'Tuition Fee',
      amount: 1500,
      frequency: 'MONTHLY',
      dueDay: 10,
      academicYearId: year.id,
    },
    update: { amount: 1500 },
  });
  const development = await prisma.feeStructure.upsert({
    where: { id: 'seed-development' },
    create: {
      id: 'seed-development',
      name: 'Development Fee',
      amount: 400,
      frequency: 'MONTHLY',
      dueDay: 10,
      academicYearId: year.id,
    },
    update: { amount: 400 },
  });
  await prisma.feeStructure.upsert({
    where: { id: 'seed-admission' },
    create: {
      id: 'seed-admission',
      name: 'Admission Fee',
      amount: 5000,
      frequency: 'ONE_TIME',
      academicYearId: year.id,
    },
    update: {},
  });
  await prisma.feeStructure.upsert({
    where: { id: 'seed-exam' },
    create: {
      id: 'seed-exam',
      name: 'Examination Fee',
      amount: 800,
      frequency: 'ANNUAL',
      dueDay: 5,
      academicYearId: year.id,
    },
    update: {},
  });

  // Wipe and rebuild demo invoices for the seeded cohort.
  const cohortIds = await prisma.student.findMany({
    where: { admissionNo: { in: seededAdmissionNos } },
    select: { id: true },
  });
  const cohortIdList = cohortIds.map((row) => row.id);
  await prisma.feeInvoice.deleteMany({
    where: { studentId: { in: cohortIdList }, structureId: { in: [tuition.id, development.id] } },
  });

  const month = today.getMonth() + 1;
  const yearNum = today.getFullYear();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? yearNum - 1 : yearNum;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  let invoiceCounter = 1;
  const newInvoiceNo = () => `INV-${yearNum}-${String(invoiceCounter++).padStart(5, '0')}`;

  for (const studentId of cohortIdList) {
    const invoiceMonth = new Date(prevYear, prevMonth - 1, 10);
    // Last month: paid via bKash for most, overdue for a few.
    const r = random();
    const lastStatus = r > 0.85 ? 'PENDING' : 'PAID';
    await prisma.feeInvoice.create({
      data: {
        invoiceNo: newInvoiceNo(),
        studentId,
        structureId: tuition.id,
        title: `Tuition Fee (${monthNames[prevMonth - 1]} ${prevYear})`,
        amount: 1500,
        paidAmount: lastStatus === 'PAID' ? 1500 : 0,
        dueDate: invoiceMonth,
        month: prevMonth,
        year: prevYear,
        status: lastStatus,
      },
    });
    // Current month: pending, due the 10th.
    await prisma.feeInvoice.create({
      data: {
        invoiceNo: newInvoiceNo(),
        studentId,
        structureId: tuition.id,
        title: `Tuition Fee (${monthNames[month - 1]} ${yearNum})`,
        amount: 1500,
        dueDate: new Date(yearNum, month - 1, 10),
        month,
        year: yearNum,
        status: 'PENDING',
      },
    });
  }

  // Payments for last month's paid tuition invoices.
  const paidLastMonth = await prisma.feeInvoice.findMany({
    where: {
      studentId: { in: cohortIdList },
      structureId: tuition.id,
      month: prevMonth,
      year: prevYear,
      status: 'PAID',
    },
    select: { id: true, amount: true },
  });
  for (const invoice of paidLastMonth) {
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.amount,
        method: 'BKASH',
        reference: `BK${Math.floor(100000000 + random() * 900000000)}`,
        receivedById: office.id,
      },
    });
  }

  // --- Exams & marks ----------------------------------------------------------
  const examName = 'Half Yearly Examination 2026';
  const staleExam = await prisma.exam.findFirst({ where: { name: examName } });
  if (staleExam) await prisma.exam.delete({ where: { id: staleExam.id } });

  const exam = await prisma.exam.create({
    data: {
      name: examName,
      kind: 'MID_TERM',
      academicYearId: year.id,
      startDate: new Date('2026-08-15'),
      endDate: new Date('2026-08-25'),
      subjects: {
        create: SUBJECTS.map((subject) => ({
          subjectId: subjectByCode.get(subject.code).id,
          maxMarks: 100,
          passMarks: 33,
        })),
      },
    },
    include: { subjects: true },
  });

  const markStudents = await prisma.student.findMany({
    where: {
      sectionId: {
        in: [
          section6A.id,
          (
            await prisma.section.findFirst({
              where: { name: 'B', schoolClass: { name: 'Grade 6' } },
            })
          ).id,
        ],
      },
    },
  });
  for (const student of markStudents) {
    for (const examSubject of exam.subjects) {
      const score = Math.max(20, Math.min(99, Math.round(45 + random() * 50)));
      const pct = score;
      const { gradeFor } = require('../src/services/grade.service');
      const { grade, gpa } = gradeFor(pct);
      await prisma.mark.create({
        data: {
          examSubjectId: examSubject.id,
          studentId: student.id,
          marksObtained: score,
          grade,
          gpa,
        },
      });
    }
  }

  // --- Timetable (Grade 6, Sunday–Thursday) ----------------------------------
  const section6B = await prisma.section.findFirst({
    where: { name: 'B', schoolClass: { name: 'Grade 6' } },
  });
  const subjectCycle = SUBJECTS.map((subject) => subjectByCode.get(subject.code));
  const findTeacherId = (code) => {
    const teacher = TEACHERS.find((row) => row.subjects.includes(code));
    return teacher ? teacherByEmail.get(teacher.email).id : null;
  };
  const buildGrid = async (section) => {
    await prisma.timetableSlot.deleteMany({ where: { sectionId: section.id } });
    const times = [
      ['08:00', '08:30', 'ASSEMBLY', null],
      ['08:30', '09:15', 'CLASS', 0],
      ['09:15', '10:00', 'CLASS', 1],
      ['10:15', '11:00', 'CLASS', 2],
      ['11:00', '11:45', 'CLASS', 3],
      ['12:00', '12:45', 'CLASS', 4],
      ['12:45', '13:30', 'CLASS', 5],
    ];
    for (let day = 0; day <= 4; day += 1) {
      // eslint-disable-next-line no-unused-vars
      for (const [startTime, endTime, kind] of times) {
        const periodNo = times.findIndex((row) => row[0] === startTime) + 1;
        if (kind === 'ASSEMBLY') {
          await prisma.timetableSlot.create({
            data: {
              sectionId: section.id,
              dayOfWeek: day,
              periodNo,
              startTime,
              endTime,
              kind: 'ASSEMBLY',
              room: 'Assembly Field',
            },
          });
          continue;
        }
        const subjectIndex = (day * 6 + (periodNo - 2)) % subjectCycle.length;
        const subject = subjectCycle[subjectIndex];
        await prisma.timetableSlot.create({
          data: {
            sectionId: section.id,
            dayOfWeek: day,
            periodNo,
            startTime,
            endTime,
            subjectId: subject.id,
            teacherId: findTeacherId(subject.code),
            room: `Room ${6}${section.name}`,
            kind: 'CLASS',
          },
        });
      }
    }
  };
  await buildGrid(section6A);
  await buildGrid(section6B);

  // --- Notices & events ---------------------------------------------------------
  const noticeSeeds = [
    {
      title: 'Mid-term routine published',
      body: 'The Half Yearly Examination routine for Grade 6 and 7 has been uploaded to the notice board. Exams run 15–25 August.',
      audience: 'ALL',
      priority: 'IMPORTANT',
      isPinned: true,
    },
    {
      title: 'Assembly moved to school field',
      body: 'Due to roof maintenance, morning assembly will be held on the school field this week.',
      audience: 'ALL',
      priority: 'URGENT',
      isPinned: false,
    },
    {
      title: 'Tuition fee reminder',
      body: 'August tuition is due by the 10th. Please pay via bKash to 01700-000000 and keep the receipt.',
      audience: 'PARENTS',
      priority: 'IMPORTANT',
      isPinned: false,
    },
    {
      title: 'Book fair starts Monday',
      body: 'The annual book fair opens Monday in the library. Students get 10% off all titles.',
      audience: 'STUDENTS',
      priority: 'NORMAL',
      isPinned: false,
    },
  ];
  for (const seed of noticeSeeds) {
    const existing = await prisma.notice.findFirst({ where: { title: seed.title } });
    if (existing) continue;
    await prisma.notice.create({ data: { ...seed, authorId: superAdmin.id } });
  }

  const eventSeeds = [
    {
      title: 'Annual Sports Day',
      description: 'Track and field events for all grades on the school ground.',
      startAt: new Date('2026-11-20T09:00:00'),
      endAt: new Date('2026-11-20T13:00:00'),
      location: 'School Field',
      audience: 'ALL',
    },
    {
      title: 'Science Fair',
      description: 'Student project showcase and lab demonstrations.',
      startAt: new Date('2026-12-05T10:00:00'),
      endAt: new Date('2026-12-05T15:00:00'),
      location: 'Science Block',
      audience: 'ALL',
    },
  ];
  for (const seed of eventSeeds) {
    const existing = await prisma.event.findFirst({ where: { title: seed.title } });
    if (existing) continue;
    await prisma.event.create({ data: seed });
  }

  // --- Library ------------------------------------------------------------------
  const bookSeeds = [
    {
      title: 'Free to Learn',
      author: 'Peter Gray',
      isbn: '9780465033332',
      category: 'Education',
      publisher: 'Basic Books',
      totalCopies: 3,
      shelfLocation: 'A-01',
    },
    {
      title: 'The Selfish Gene',
      author: 'Richard Dawkins',
      isbn: '9780198788607',
      category: 'Science',
      publisher: 'Oxford',
      totalCopies: 2,
      shelfLocation: 'A-02',
    },
    {
      title: 'Sapiens',
      author: 'Yuval Noah Harari',
      isbn: '9780062316110',
      category: 'History',
      publisher: 'Harper',
      totalCopies: 4,
      shelfLocation: 'A-03',
    },
    {
      title: 'A Brief History of Time',
      author: 'Stephen Hawking',
      isbn: '9780553380163',
      category: 'Science',
      publisher: 'Bantam',
      totalCopies: 2,
      shelfLocation: 'A-04',
    },
    {
      title: 'Gitanjali',
      author: 'Rabindranath Tagore',
      isbn: '9780140183932',
      category: 'Literature',
      publisher: 'Penguin',
      totalCopies: 5,
      shelfLocation: 'B-01',
    },
    {
      title: 'Calculus Made Easy',
      author: 'Silvanus Thompson',
      isbn: '9780312185487',
      category: 'Mathematics',
      publisher: 'St. Martin’s',
      totalCopies: 2,
      shelfLocation: 'B-02',
    },
    {
      title: 'The Wright Brothers',
      author: 'David McCullough',
      isbn: '9780743233392',
      category: 'Biography',
      publisher: 'Simon & Schuster',
      totalCopies: 2,
      shelfLocation: 'B-03',
    },
    {
      title: 'Python for Everybody',
      author: 'Charles Severance',
      isbn: '9781530051120',
      category: 'ICT',
      publisher: 'PY4E',
      totalCopies: 6,
      shelfLocation: 'C-01',
    },
  ];
  const bookRows = [];
  for (const seed of bookSeeds) {
    const book = await prisma.book.upsert({
      where: { isbn: seed.isbn },
      create: { ...seed, availableCopies: seed.totalCopies },
      update: { totalCopies: seed.totalCopies, shelfLocation: seed.shelfLocation },
    });
    bookRows.push(book);
  }

  // Rebuild issues for the two demo students.
  await prisma.bookIssue.deleteMany({ where: { studentId: { in: cohortIdList } } });
  const issueTargets = await prisma.student.findMany({
    where: { admissionNo: { in: ['ADV-2026-0001', 'ADV-2026-0002', 'ADV-2026-0011'] } },
  });
  if (issueTargets[0] && bookRows[2]) {
    await prisma.bookIssue.create({
      data: {
        bookId: bookRows[2].id,
        studentId: issueTargets[0].id,
        dueDate: new Date(Date.now() + 7 * 86400000),
      },
    });
    await prisma.book.update({
      where: { id: bookRows[2].id },
      data: { availableCopies: { decrement: 1 } },
    });
  }
  if (issueTargets[1] && bookRows[7]) {
    await prisma.bookIssue.create({
      data: {
        bookId: bookRows[7].id,
        studentId: issueTargets[1].id,
        dueDate: new Date(Date.now() + 14 * 86400000),
      },
    });
    await prisma.book.update({
      where: { id: bookRows[7].id },
      data: { availableCopies: { decrement: 1 } },
    });
  }

  // --- Transport ------------------------------------------------------------------
  await prisma.route.deleteMany({ where: { name: { in: ['Mirpur Route', 'Dhanmondi Route'] } } });
  const mirpur = await prisma.route.create({
    data: {
      name: 'Mirpur Route',
      description: 'Mirpur 10 → Mirpur 12 → Pallabi → Agargaon → school',
      stops: {
        create: [
          { name: 'Mirpur 10', sequence: 1, pickupTime: '07:00', monthlyFee: 800 },
          { name: 'Mirpur 12', sequence: 2, pickupTime: '07:15', monthlyFee: 700 },
          { name: 'Pallabi', sequence: 3, pickupTime: '07:30', monthlyFee: 600 },
          { name: 'Agargaon', sequence: 4, pickupTime: '07:45', monthlyFee: 500 },
        ],
      },
    },
    include: { stops: true },
  });
  const dhanmondi = await prisma.route.create({
    data: {
      name: 'Dhanmondi Route',
      description: 'Dhanmondi 8 → Dhanmondi 15 → Science Lab → school',
      stops: {
        create: [
          { name: 'Dhanmondi 8', sequence: 1, pickupTime: '07:05', monthlyFee: 900 },
          { name: 'Dhanmondi 15', sequence: 2, pickupTime: '07:20', monthlyFee: 750 },
          { name: 'Science Lab', sequence: 3, pickupTime: '07:35', monthlyFee: 650 },
        ],
      },
    },
    include: { stops: true },
  });

  for (const [regNo, model, routeId] of [
    ['DHAKA-METRO-GA-11-2345', 'Hino Rosa', mirpur.id],
    ['DHAKA-METRO-KHA-22-8765', 'Toyota Coaster', dhanmondi.id],
  ]) {
    await prisma.vehicle.upsert({
      where: { regNo },
      create: {
        regNo,
        model,
        capacity: 36,
        driverName: 'Karim Uddin',
        driverPhone: '+880 1811-222333',
        routeId,
      },
      update: { routeId },
    });
  }

  await prisma.studentTransport.deleteMany({ where: { studentId: { in: cohortIdList } } });
  const transportStudents = await prisma.student.findMany({
    where: {
      admissionNo: {
        in: [
          'ADV-2026-0001',
          'ADV-2026-0004',
          'ADV-2026-0007',
          'ADV-2026-0012',
          'ADV-2026-0015',
          'ADV-2026-0023',
        ],
      },
    },
    orderBy: { admissionNo: 'asc' },
  });
  for (const [index, student] of transportStudents.entries()) {
    const useMirpur = index % 2 === 0;
    const route = useMirpur ? mirpur : dhanmondi;
    const stop = route.stops[index % route.stops.length];
    await prisma.studentTransport.create({
      data: {
        studentId: student.id,
        routeId: route.id,
        stopId: stop.id,
        monthlyFee: stop.monthlyFee,
      },
    });
  }

  // --- School settings -------------------------------------------------------------
  await prisma.schoolSetting.upsert({
    where: { id: 'default' },
    create: {
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
    },
    update: {},
  });

  // --- One support message -----------------------------------------------------------
  const existingMessage = await prisma.message.findFirst({ where: { conversationId: 'support' } });
  if (!existingMessage) {
    await prisma.message.create({
      data: {
        conversationId: 'support',
        sender: 'SYSTEM',
        content: 'Welcome to Aurora School support. How can we help today?',
      },
    });
  }

  console.log('Seed complete.');
  console.log('  Super admin : admin@aurora.school / aurora123');
  console.log('  Office admin: office@aurora.school / aurora123 (all permissions)');
  console.log('  Teachers    : ayesha@aurora.school … mim@aurora.school / aurora123');
  console.log('  Student     : student@aurora.school / aurora123');
  console.log(
    '  Parent      : parent@aurora.school / aurora123 (linked to ADV-2026-0001, ADV-2026-0002)',
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
