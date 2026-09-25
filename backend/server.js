const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { signToken, authenticate, requireRole } = require('./auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---------- Auth routes ----------

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password are required'
    });
  }

  const user = db
    .prepare(
      'SELECT * FROM users WHERE username = ? COLLATE NOCASE'
    )
    .get(username.trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({
      error: 'Invalid username or password'
    });
  }

  const token = signToken(user);

  res.json({
    token,
    user: {
      username: user.username,
      role: user.role,
      name: user.display_name
    }
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ---------- Student routes ----------

app.use('/api/students', authenticate);

app.get('/api/students', (req, res) => {
  const {
    q = '',
    degree_course = '',
    department = '',
    year_of_study = '',
    semester = '',
    section = '',
    gender = '',
    residential_status = '',
    admission_category = '',
    status = '',
    sortBy = 'first_name',
    sortDir = 'asc',
    page = '1',
    pageSize = '10'
  } = req.query;

  const allowedSort = [
    'register_no',
    'first_name',
    'last_name',
    'degree_course',
    'department',
    'year_of_study',
    'semester',
    'section',
    'attendance_percentage',
    'gender',
    'residential_status',
    'admission_category',
    'status'
  ];

  const sortColumn = allowedSort.includes(sortBy)
    ? sortBy
    : 'first_name';

  const direction =
    sortDir.toLowerCase() === 'desc'
      ? 'DESC'
      : 'ASC';

  const conditions = [];
  const params = [];

  if (q) {
    conditions.push(`
      (
        register_no LIKE ?
        OR first_name LIKE ?
        OR last_name LIKE ?
        OR student_email LIKE ?
        OR department LIKE ?
      )
    `);

    const search = `%${q}%`;

    params.push(
      search,
      search,
      search,
      search,
      search
    );
  }

  if (degree_course) {
    conditions.push('degree_course = ?');
    params.push(degree_course);
  }

  if (department) {
    conditions.push('department = ?');
    params.push(department);
  }

  if (year_of_study) {
    conditions.push('year_of_study = ?');
    params.push(year_of_study);
  }

  if (semester) {
    conditions.push('semester = ?');
    params.push(semester);
  }

  if (section) {
    conditions.push('section = ?');
    params.push(section);
  }

  if (gender) {
    conditions.push('gender = ?');
    params.push(gender);
  }

  if (residential_status) {
    conditions.push('residential_status = ?');
    params.push(residential_status);
  }

  if (admission_category) {
    conditions.push('admission_category = ?');
    params.push(admission_category);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const total = db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM students
       ${whereClause}`
    )
    .get(...params).c;

  const pageNum =
    Math.max(parseInt(page, 10) || 1, 1);

  const size =
    Math.min(
      Math.max(parseInt(pageSize, 10) || 10, 1),
      100
    );

  const offset = (pageNum - 1) * size;

  const rows = db
    .prepare(`
      SELECT *
      FROM students
      ${whereClause}
      ORDER BY ${sortColumn} ${direction}
      LIMIT ? OFFSET ?
    `)
    .all(...params, size, offset);

  res.json({
    data: rows,
    pagination: {
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size) || 1
    }
  });
});

// ---------- Filters ----------

app.get('/api/students/filters', (req, res) => {
  const cols = [
    'degree_course',
    'department',
    'year_of_study',
    'semester',
    'section',
    'gender',
    'residential_status',
    'admission_category',
    'status'
  ];

  const result = {};

  for (const col of cols) {
    result[col] = db
      .prepare(
        `SELECT DISTINCT ${col}
         FROM students
         ORDER BY ${col}`
      )
      .all()
      .map(r => r[col]);
  }

  res.json(result);
});

// ---------- Single student ----------

app.get('/api/students/:id', (req, res) => {
  const student = db
    .prepare(
      'SELECT * FROM students WHERE id = ?'
    )
    .get(req.params.id);

  if (!student) {
    return res.status(404).json({
      error: 'Student not found'
    });
  }

  res.json(student);
});

// ---------- Create ----------

app.post('/api/students', requireRole('admin'), (req, res) => {
  const {
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
  } = req.body;

  if (
    !register_no ||
    !first_name ||
    !last_name ||
    !gender ||
    !date_of_birth ||
    !degree_course ||
    !department ||
    !year_of_study ||
    !semester ||
    !section ||
    attendance_percentage === undefined ||
    !residential_status ||
    !admission_category
  ) {
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  try {
    db.prepare(`
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
    `).run(
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
      student_email || null,
      student_phone || null,
      parent_guardian_name || null,
      parent_contact_number || null,
      permanent_address || null,
      blood_group || null,
      admission_category,
      status || 'Active'
    );

    const created = db
      .prepare(
        'SELECT * FROM students WHERE register_no = ?'
      )
      .get(register_no);

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});

// ---------- Update ----------

app.put('/api/students/:id', requireRole('admin'), (req, res) => {
  const existing = db
    .prepare(
      'SELECT * FROM students WHERE id = ?'
    )
    .get(req.params.id);

  if (!existing) {
    return res.status(404).json({
      error: 'Student not found'
    });
  }

  const merged = {
    ...existing,
    ...req.body
  };

  db.prepare(`
    UPDATE students SET
      register_no=?,
      first_name=?,
      last_name=?,
      gender=?,
      date_of_birth=?,
      degree_course=?,
      department=?,
      year_of_study=?,
      semester=?,
      section=?,
      attendance_percentage=?,
      residential_status=?,
      student_email=?,
      student_phone=?,
      parent_guardian_name=?,
      parent_contact_number=?,
      permanent_address=?,
      blood_group=?,
      admission_category=?,
      status=?
    WHERE id=?
  `).run(
    merged.register_no,
    merged.first_name,
    merged.last_name,
    merged.gender,
    merged.date_of_birth,
    merged.degree_course,
    merged.department,
    merged.year_of_study,
    merged.semester,
    merged.section,
    merged.attendance_percentage,
    merged.residential_status,
    merged.student_email,
    merged.student_phone,
    merged.parent_guardian_name,
    merged.parent_contact_number,
    merged.permanent_address,
    merged.blood_group,
    merged.admission_category,
    merged.status,
    req.params.id
  );

  res.json({ success: true });
});

// ---------- Delete ----------

app.delete('/api/students/:id', requireRole('admin'), (req, res) => {
  const info = db
    .prepare(
      'DELETE FROM students WHERE id = ?'
    )
    .run(req.params.id);

  if (info.changes === 0) {
    return res.status(404).json({
      error: 'Student not found'
    });
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(
    `Student Portal API running on http://localhost:${PORT}`
  );
});