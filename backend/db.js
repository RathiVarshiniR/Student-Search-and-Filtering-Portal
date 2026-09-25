const path = require('path');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

// Use Render's persistent disk when DB_PATH is provided.
// Locally, it continues to use backend/students.db.
const dbPath =
  process.env.DB_PATH || path.join(__dirname, 'students.db');

const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    display_name TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    register_no TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    degree_course TEXT NOT NULL,
    department TEXT NOT NULL,
    year_of_study INTEGER NOT NULL,
    semester INTEGER NOT NULL,
    section TEXT NOT NULL,
    attendance_percentage REAL NOT NULL,
    residential_status TEXT NOT NULL,
    student_email TEXT,
    student_phone TEXT,
    parent_guardian_name TEXT,
    parent_contact_number TEXT,
    permanent_address TEXT,
    blood_group TEXT,
    admission_category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active'
  );
`);

function seedIfEmpty() {
  const count = db
    .prepare('SELECT COUNT(*) AS c FROM students')
    .get().c;

  if (count > 0) return;

  const firstNames = [
    'Aarav', 'Aditya', 'Arjun', 'Karthik', 'Rahul',
    'Rohan', 'Vikram', 'Nikhil', 'Siddharth', 'Varun',
    'Ananya', 'Diya', 'Isha', 'Priya', 'Sneha',
    'Aditi', 'Meera', 'Saanvi', 'Riya', 'Pooja'
  ];

  const lastNames = [
    'Sharma', 'Verma', 'Iyer', 'Reddy', 'Nair',
    'Gupta', 'Rao', 'Menon', 'Patel', 'Singh',
    'Kumar', 'Das', 'Pillai', 'Joshi', 'Mehta',
    'Krishnan', 'Desai', 'Shetty', 'Kapoor', 'Bose'
  ];

  const courses = [
    'B.Tech',
    'B.E.',
    'B.Sc.',
    'BCA',
    'BBA'
  ];

  const departments = [
    'Computer Science and Engineering',
    'CSE (Artificial Intelligence & Machine Learning)',
    'Information Technology',
    'Electronics and Communication Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering'
  ];

  const genders = ['Male', 'Female'];

  const sections = ['A', 'B', 'C'];

  const residentialStatuses = [
    'Day Scholar',
    'Hosteller'
  ];

  const bloodGroups = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  ];

  const admissionCategories = [
    'General',
    'OBC',
    'SC',
    'ST',
    'EWS',
    'Management Quota',
    'NRI Quota'
  ];

  const statuses = [
    'Active',
    'Active',
    'Active',
    'Active',
    'Inactive',
    'Graduated'
  ];

  const insert = db.prepare(`
    INSERT INTO students (
      register_no,
      first_name,
      last_name,
      gender,
      date_of_birth,
      degree_course,
      department,
      year_of_study,
      semester,
      section,
      attendance_percentage,
      residential_status,
      student_email,
      student_phone,
      parent_guardian_name,
      parent_contact_number,
      permanent_address,
      blood_group,
      admission_category,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION');

  try {
    for (let i = 1; i <= 160; i++) {
      const firstName =
        firstNames[
          Math.floor(Math.random() * firstNames.length)
        ];

      const lastName =
        lastNames[
          Math.floor(Math.random() * lastNames.length)
        ];

      const course =
        courses[
          Math.floor(Math.random() * courses.length)
        ];

      const department =
        departments[
          Math.floor(Math.random() * departments.length)
        ];

      const gender =
        genders[
          Math.floor(Math.random() * genders.length)
        ];

      const yearOfStudy =
        Math.floor(Math.random() * 4) + 1;

      const semester =
        (yearOfStudy * 2) -
        (Math.random() < 0.5 ? 1 : 0);

      const section =
        sections[
          Math.floor(Math.random() * sections.length)
        ];

      const attendance =
        Math.round(
          (65 + Math.random() * 33) * 100
        ) / 100;

      const residentialStatus =
        residentialStatuses[
          Math.floor(
            Math.random() * residentialStatuses.length
          )
        ];

      const bloodGroup =
        bloodGroups[
          Math.floor(Math.random() * bloodGroups.length)
        ];

      const admissionCategory =
        admissionCategories[
          Math.floor(
            Math.random() * admissionCategories.length
          )
        ];

      const status =
        statuses[
          Math.floor(Math.random() * statuses.length)
        ];

      const birthYear =
        2002 + Math.floor(Math.random() * 7);

      const birthMonth =
        String(
          Math.floor(Math.random() * 12) + 1
        ).padStart(2, '0');

      const birthDay =
        String(
          Math.floor(Math.random() * 28) + 1
        ).padStart(2, '0');

      const dateOfBirth =
        `${birthYear}-${birthMonth}-${birthDay}`;

      insert.run(
        `REG2026${String(i).padStart(3, '0')}`,
        firstName,
        lastName,
        gender,
        dateOfBirth,
        course,
        department,
        yearOfStudy,
        semester,
        section,
        attendance,
        residentialStatus,
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@college.edu`,
        `9${Math.floor(
          100000000 + Math.random() * 899999999
        )}`,
        `Mr./Ms. ${lastName}`,
        `9${Math.floor(
          100000000 + Math.random() * 899999999
        )}`,
        `${Math.floor(Math.random() * 100) + 1}, College Road, Chennai`,
        bloodGroup,
        admissionCategory,
        status
      );
    }

    db.exec('COMMIT');

    console.log('Seeded 160 college students.');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function seedUsersIfEmpty() {
  const defaultUsers = [
    {
      username: 'Kavin DR',
      password: 'kavin@9',
      role: 'admin',
      display_name: 'Administrator'
    },
    {
      username: 'Rathi',
      password: 'rathi@7',
      role: 'student',
      display_name: 'Student User'
    }
  ];

  for (const u of defaultUsers) {
    const existing = db
      .prepare(
        'SELECT id FROM users WHERE role = ? LIMIT 1'
      )
      .get(u.role);

    const hash = bcrypt.hashSync(u.password, 10);

    if (existing) {
      db.prepare(`
        UPDATE users
        SET username = ?,
            password_hash = ?,
            display_name = ?
        WHERE id = ?
      `).run(
        u.username,
        hash,
        u.display_name,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO users (
          username,
          password_hash,
          role,
          display_name
        )
        VALUES (?, ?, ?, ?)
      `).run(
        u.username,
        hash,
        u.role,
        u.display_name
      );
    }
  }

  console.log('User credentials synchronized.');
}
seedIfEmpty();
seedUsersIfEmpty();

module.exports = db;