const API_BASE = '/api/students';

// ---------- Auth ----------

let token = sessionStorage.getItem('token');
let currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
let isAdmin = currentUser.role === 'admin';

if (!token) {
  window.location.href = 'login.html';
}

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extra
  };
}

async function verifySession() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: authHeaders()
    });

    if (!res.ok) {
      throw new Error('Invalid session');
    }

    const body = await res.json();

    if (body.user) {
      currentUser = body.user;
      isAdmin = currentUser.role === 'admin';

      sessionStorage.setItem(
        'user',
        JSON.stringify(currentUser)
      );
    }

  } catch (err) {
    sessionStorage.clear();
    window.location.href = 'login.html';
  }
}

function renderUserChip() {
  const name =
    currentUser.name ||
    currentUser.display_name ||
    currentUser.username ||
    'User';

  document.getElementById('userAvatar').textContent =
    name.charAt(0).toUpperCase();

  document.getElementById('userName').textContent =
    name;

  document.getElementById('userRole').textContent =
    currentUser.role === 'admin'
      ? 'Administrator'
      : 'Student';

  if (isAdmin) {
    document.getElementById('addBtn').hidden = false;
    document.getElementById('actionsHeader').hidden = false;
  } else {
    document.getElementById('viewerNotice').hidden = false;
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.clear();
  window.location.href = 'login.html';
});

// ---------- State ----------

const state = {
  q: '',
  degree_course: '',
  department: '',
  year_of_study: '',
  semester: '',
  section: '',
  gender: '',
  residential_status: '',
  admission_category: '',
  status: '',
  sortBy: 'first_name',
  sortDir: 'asc',
  page: 1,
  pageSize: 10
};

let editingId = null;

const el = id => document.getElementById(id);

let debounceTimer;

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(
      () => fn(...args),
      delay
    );
  };
}

// ---------- API ----------

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: authHeaders(options.headers || {})
  });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = 'login.html';
    throw new Error('Session expired');
  }

  return res;
}

// ---------- Filters ----------

async function loadFilters() {
  const res = await apiFetch(`${API_BASE}/filters`);

  if (!res.ok) {
    throw new Error('Could not load filters');
  }

  const filters = await res.json();

  const map = {
    degreeFilter: filters.degree_course,
    departmentFilter: filters.department,
    yearFilter: filters.year_of_study,
    semesterFilter: filters.semester,
    sectionFilter: filters.section,
    genderFilter: filters.gender,
    residentialFilter: filters.residential_status,
    admissionCategoryFilter: filters.admission_category,
    statusFilter: filters.status
  };

  for (const [id, values] of Object.entries(map)) {
    const select = el(id);

    if (!select) continue;

    select.innerHTML = '<option value="">All</option>';

    (values || []).forEach(value => {
      const option = document.createElement('option');

      option.value = value;
      option.textContent = value;

      select.appendChild(option);
    });
  }
}

// ---------- Students ----------

async function fetchStudents() {
  const params = new URLSearchParams({
    q: state.q,
    degree_course: state.degree_course,
    department: state.department,
    year_of_study: state.year_of_study,
    semester: state.semester,
    section: state.section,
    gender: state.gender,
    residential_status: state.residential_status,
    admission_category: state.admission_category,
    status: state.status,
    sortBy: state.sortBy,
    sortDir: state.sortDir,
    page: state.page,
    pageSize: state.pageSize
  });

  el('resultCount').textContent = 'Loading…';

  const res = await apiFetch(
    `${API_BASE}?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error('Could not load students');
  }

  const result = await res.json();

  renderTable(result.data || []);
  renderPagination(result.pagination);
}

// ---------- Table ----------

function renderTable(rows) {
  const body = el('tableBody');

  body.innerHTML = '';

  const colCount = isAdmin ? 21 : 20;

  if (rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="${colCount}" class="empty-row">
          No students found.
        </td>
      </tr>
    `;

    return;
  }

  rows.forEach(student => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(student.register_no)}</td>

      <td>${escapeHtml(student.first_name)}</td>

      <td>${escapeHtml(student.last_name)}</td>

      <td>${escapeHtml(student.gender)}</td>

      <td>${escapeHtml(student.date_of_birth)}</td>

      <td>${escapeHtml(student.degree_course)}</td>

      <td>${escapeHtml(student.department)}</td>

      <td>${escapeHtml(student.year_of_study)}</td>

      <td>${escapeHtml(student.semester)}</td>

      <td>${escapeHtml(student.section)}</td>

      <td>
        ${student.attendance_percentage}%
      </td>

      <td>${escapeHtml(student.residential_status)}</td>

      <td>${escapeHtml(student.student_email || '')}</td>

      <td>${escapeHtml(student.student_phone || '')}</td>

      <td>${escapeHtml(student.parent_guardian_name || '')}</td>

      <td>${escapeHtml(student.parent_contact_number || '')}</td>

      <td>${escapeHtml(student.permanent_address || '')}</td>

      <td>${escapeHtml(student.blood_group || '')}</td>

      <td>${escapeHtml(student.admission_category)}</td>

      <td>
        <span class="badge ${escapeHtml(student.status)}">
          ${escapeHtml(student.status)}
        </span>
      </td>

      ${
        isAdmin
          ? `
            <td class="actions-cell">
              <button
                class="row-action"
                data-action="edit"
                data-id="${student.id}">
                Edit
              </button>

              <button
                class="row-action danger"
                data-action="delete"
                data-id="${student.id}">
                Delete
              </button>
            </td>
          `
          : ''
      }
    `;

    body.appendChild(tr);
  });

  if (isAdmin) {
    body
      .querySelectorAll('[data-action="edit"]')
      .forEach(button => {
        button.addEventListener('click', () => {
          openEditForm(
            button.dataset.id,
            rows
          );
        });
      });

    body
      .querySelectorAll('[data-action="delete"]')
      .forEach(button => {
        button.addEventListener('click', () => {
          deleteStudent(button.dataset.id);
        });
      });
  }
}

// ---------- Pagination ----------

function renderPagination(pagination) {
  el('resultCount').textContent =
    `${pagination.total} student(s) found`;

  el('pageInfo').textContent =
    `Page ${pagination.page} of ${pagination.totalPages}`;

  el('prevPage').disabled =
    pagination.page <= 1;

  el('nextPage').disabled =
    pagination.page >= pagination.totalPages;
}

// ---------- Security ----------

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]
  );
}

// ---------- Search ----------

el('searchInput').addEventListener(
  'input',
  debounce(event => {
    state.q = event.target.value.trim();
    state.page = 1;

    fetchStudents();
  }, 300)
);

// ---------- Filters ----------

const filterMap = {
  degreeFilter: 'degree_course',
  departmentFilter: 'department',
  yearFilter: 'year_of_study',
  semesterFilter: 'semester',
  sectionFilter: 'section',
  genderFilter: 'gender',
  residentialFilter: 'residential_status',
  admissionCategoryFilter: 'admission_category',
  statusFilter: 'status'
};

Object.entries(filterMap).forEach(
  ([elementId, stateKey]) => {

    el(elementId).addEventListener(
      'change',
      event => {
        state[stateKey] =
          event.target.value;

        state.page = 1;

        fetchStudents();
      }
    );
  }
);

// ---------- Sorting ----------

el('sortBy').addEventListener(
  'change',
  event => {
    state.sortBy =
      event.target.value;

    fetchStudents();
  }
);

el('sortDirBtn').addEventListener(
  'click',
  () => {

    state.sortDir =
      state.sortDir === 'asc'
        ? 'desc'
        : 'asc';

    el('sortDirBtn').textContent =
      state.sortDir === 'asc'
        ? '↑ Ascending'
        : '↓ Descending';

    fetchStudents();
  }
);

// ---------- Reset ----------

el('resetBtn').addEventListener(
  'click',
  () => {

    Object.assign(state, {
      q: '',
      degree_course: '',
      department: '',
      year_of_study: '',
      semester: '',
      section: '',
      gender: '',
      residential_status: '',
      admission_category: '',
      status: '',
      sortBy: 'first_name',
      sortDir: 'asc',
      page: 1,
      pageSize: 10
    });

    el('searchInput').value = '';

    Object.keys(filterMap).forEach(id => {
      el(id).value = '';
    });

    el('sortBy').value = 'first_name';

    el('sortDirBtn').textContent =
      '↑ Ascending';

    el('pageSize').value = '10';

    fetchStudents();
  }
);

// ---------- Pagination buttons ----------

el('prevPage').addEventListener(
  'click',
  () => {
    if (state.page > 1) {
      state.page--;
      fetchStudents();
    }
  }
);

el('nextPage').addEventListener(
  'click',
  () => {
    state.page++;
    fetchStudents();
  }
);

el('pageSize').addEventListener(
  'change',
  event => {
    state.pageSize =
      parseInt(event.target.value, 10);

    state.page = 1;

    fetchStudents();
  }
);

// ---------- Add / Edit ----------

const formFields = [
  'register_no',
  'first_name',
  'last_name',
  'gender',
  'date_of_birth',
  'degree_course',
  'department',
  'year_of_study',
  'semester',
  'section',
  'attendance_percentage',
  'residential_status',
  'student_email',
  'student_phone',
  'parent_guardian_name',
  'parent_contact_number',
  'permanent_address',
  'blood_group',
  'admission_category',
  'status'
];

function openAddForm() {
  editingId = null;

  el('formTitle').textContent =
    'Add student';

  el('studentForm').reset();

  el('formError').hidden = true;

  el('formPanel').hidden = false;

  el('f_register_no').focus();
}

function openEditForm(id, rows) {
  const student =
    rows.find(
      row => String(row.id) === String(id)
    );

  if (!student) return;

  editingId = id;

  el('formTitle').textContent =
    `Edit — ${student.first_name} ${student.last_name}`;

  formFields.forEach(fieldName => {
    const field =
      el(`f_${fieldName}`);

    if (field) {
      field.value =
        student[fieldName] ?? '';
    }
  });

  el('formError').hidden = true;

  el('formPanel').hidden = false;

  el('formPanel').scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}

function closeForm() {
  el('formPanel').hidden = true;
  editingId = null;
}

if (isAdmin) {

  el('addBtn').addEventListener(
    'click',
    openAddForm
  );

  el('cancelFormBtn').addEventListener(
    'click',
    closeForm
  );

  el('studentForm').addEventListener(
    'submit',
    async event => {

      event.preventDefault();

      const payload = {};

      formFields.forEach(fieldName => {
        const field =
          el(`f_${fieldName}`);

        if (field) {
          payload[fieldName] =
            field.value.trim();
        }
      });

      payload.year_of_study =
        parseInt(
          payload.year_of_study,
          10
        );

      payload.semester =
        parseInt(
          payload.semester,
          10
        );

      payload.attendance_percentage =
        parseFloat(
          payload.attendance_percentage
        );

      const saveBtn =
        el('saveBtn');

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      try {

        const url =
          editingId
            ? `${API_BASE}/${editingId}`
            : API_BASE;

        const method =
          editingId
            ? 'PUT'
            : 'POST';

        const res =
          await apiFetch(
            url,
            {
              method,
              headers: {
                'Content-Type':
                  'application/json'
              },
              body:
                JSON.stringify(payload)
            }
          );

        const body =
          await res.json();

        if (!res.ok) {
          throw new Error(
            body.error ||
            'Could not save student'
          );
        }

        closeForm();

        await loadFilters();
        await fetchStudents();

      } catch (error) {

        el('formError').textContent =
          error.message;

        el('formError').hidden = false;

      } finally {

        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    }
  );
}

// ---------- Delete ----------

async function deleteStudent(id) {

  if (
    !confirm(
      'Remove this student from the register? This cannot be undone.'
    )
  ) {
    return;
  }

  const res =
    await apiFetch(
      `${API_BASE}/${id}`,
      {
        method: 'DELETE'
      }
    );

  const body =
    await res.json();

  if (!res.ok) {
    alert(
      body.error ||
      'Could not delete student'
    );

    return;
  }

  await fetchStudents();
}

// ---------- Init ----------

(async function init() {

  await verifySession();

  renderUserChip();

  await loadFilters();

  await fetchStudents();

})();