"use strict";

class Student {
  #name;
  #subjectOne;
  #subjectTwo;
  #subjectThree;
  #attendance;

  constructor(name, subjectOne, subjectTwo, subjectThree, attendance) {
    this.name = name;
    this.subjectOne = subjectOne;
    this.subjectTwo = subjectTwo;
    this.subjectThree = subjectThree;
    this.attendance = attendance;
  }

  get name() {
    return this.#name;
  }

  set name(value) {
    const cleanName = String(value).trim();

    if (!cleanName) {
      throw new Error("من فضلك اكتب اسم الطالب.");
    }

    this.#name = cleanName;
  }

  get subjectOne() {
    return this.#subjectOne;
  }

  set subjectOne(value) {
    this.#subjectOne = this.#validateScore(value, "المادة الأولى");
  }

  get subjectTwo() {
    return this.#subjectTwo;
  }

  set subjectTwo(value) {
    this.#subjectTwo = this.#validateScore(value, "المادة الثانية");
  }

  get subjectThree() {
    return this.#subjectThree;
  }

  set subjectThree(value) {
    this.#subjectThree = this.#validateScore(value, "المادة الثالثة");
  }

  get attendance() {
    return this.#attendance;
  }

  set attendance(value) {
    this.#attendance = this.#validateScore(value, "نسبة الحضور");
  }

  #validateScore(value, label) {
    if (value === "" || value === null || value === undefined) {
      throw new Error(`حقل ${label} مطلوب.`);
    }

    const score = Number(value);

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`${label}: أدخل رقماً من ٠ إلى ١٠٠.`);
    }

    return score;
  }

  get average() {
    return (this.#subjectOne + this.#subjectTwo + this.#subjectThree) / 3;
  }
}

const studentsList = [];
const STUDENTS_STORAGE_KEY = "miyar-students";

const studentForm = document.getElementById("studentForm");
const studentNameInput = document.getElementById("studentName");
const subjectOneInput = document.getElementById("subjectOne");
const subjectTwoInput = document.getElementById("subjectTwo");
const subjectThreeInput = document.getElementById("subjectThree");
const attendanceInput = document.getElementById("attendance");

const studentsListBox = document.getElementById("studentsList");
const emptyState = document.getElementById("emptyState");
const errorBox = document.getElementById("errorBox");
const reportBox = document.getElementById("reportBox");
const committeeButton = document.getElementById("committeeButton");
const studentCount = document.getElementById("studentCount");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const deleteDialogMessage = document.getElementById("deleteDialogMessage");
const cancelDeleteButton = document.getElementById("cancelDeleteButton");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");
const toastMessage = document.getElementById("toastMessage");
const toastText = document.getElementById("toastText");

let pendingDelete = null;
let toastTimeout;

const arabicNumber = new Intl.NumberFormat("ar-EG", {
  maximumFractionDigits: 2
});

function formatNumber(value) {
  return arabicNumber.format(value);
}

function updateStudentCount() {
  studentCount.textContent =
    `${formatNumber(studentsList.length)} ` +
    `${studentsList.length === 1 ? "طالب" : "طلاب"}`;
}

function saveStudents() {
  try {
    const studentsToSave = studentsList.map((student) => ({
      name: student.name,
      subjectOne: student.subjectOne,
      subjectTwo: student.subjectTwo,
      subjectThree: student.subjectThree,
      attendance: student.attendance
    }));

    localStorage.setItem(
      STUDENTS_STORAGE_KEY,
      JSON.stringify(studentsToSave)
    );
  } catch {
    // يظل التطبيق يعمل لو تخزين المتصفح غير متاح.
  }
}

function loadSavedStudents() {
  try {
    const savedStudents = JSON.parse(
      localStorage.getItem(STUDENTS_STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(savedStudents)) return;

    savedStudents.forEach((savedStudent) => {
      try {
        const student = new Student(
          savedStudent.name,
          savedStudent.subjectOne,
          savedStudent.subjectTwo,
          savedStudent.subjectThree,
          savedStudent.attendance
        );

        studentsList.push(student);
        renderStudent(student);
      } catch {
        // يتجاوز أي سجل محفوظ غير صالح ويكمل تحميل بقية الطلاب.
      }
    });

    updateStudentCount();
  } catch {
    // يبدأ بسجل فارغ لو البيانات المحفوظة غير متاحة أو تالفة.
  }
}

function renderStudent(student) {
  emptyState.hidden = true;

  const row = document.createElement("article");
  row.className = "student-row";

  const avatar = document.createElement("span");
  avatar.className = "student-avatar";
  avatar.textContent = student.name.charAt(0);

  const meta = document.createElement("div");
  meta.className = "student-meta";

  const name = document.createElement("strong");
  name.textContent = student.name;

  const detail = document.createElement("span");
  detail.textContent = `الحضور ${formatNumber(student.attendance)}٪`;

  meta.append(name, detail);

  const average = document.createElement("span");
  average.className = "average-pill";
  average.textContent = `المتوسط ${formatNumber(student.average)}`;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-student-button";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `حذف الطالب ${student.name}`);
  deleteButton.title = "حذف الطالب";
  deleteButton.textContent = "🗑️";
  deleteButton.addEventListener("click", () => {
    openDeleteDialog(student, row, deleteButton);
  });

  row.append(avatar, meta, average, deleteButton);
  studentsListBox.append(row);
}

function openDeleteDialog(student, row, trigger) {
  pendingDelete = { student, row, trigger };
  deleteDialogMessage.textContent =
    `هيتم حذف ${student.name} من سجل الطلاب. متأكد؟`;

  confirmDeleteModal.hidden = false;
  document.body.classList.add("dialog-open");
  cancelDeleteButton.focus();
}

function closeDeleteDialog() {
  confirmDeleteModal.hidden = true;
  document.body.classList.remove("dialog-open");

  if (pendingDelete?.trigger?.isConnected) {
    pendingDelete.trigger.focus();
  }

  pendingDelete = null;
}

function showDeleteToast(studentName) {
  toastText.textContent = `تم حذف ${studentName} من السجل.`;
  toastMessage.hidden = false;

  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toastMessage.hidden = true;
  }, 2800);
}

cancelDeleteButton.addEventListener("click", closeDeleteDialog);

confirmDeleteModal.addEventListener("click", (event) => {
  if (event.target === confirmDeleteModal) {
    closeDeleteDialog();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !confirmDeleteModal.hidden) {
    closeDeleteDialog();
  }
});

confirmDeleteButton.addEventListener("click", () => {
  if (!pendingDelete) return;

  const { student, row } = pendingDelete;
  const studentIndex = studentsList.indexOf(student);

  if (studentIndex !== -1) {
    studentsList.splice(studentIndex, 1);
    row.remove();
    saveStudents();
    updateStudentCount();

    if (studentsList.length === 0) {
      emptyState.hidden = false;
    }

    reportBox.hidden = true;
    closeDeleteDialog();
    showDeleteToast(student.name);
  } else {
    closeDeleteDialog();
  }
});

studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  errorBox.textContent = "";

  try {
    const student = new Student(
      studentNameInput.value,
      subjectOneInput.value,
      subjectTwoInput.value,
      subjectThreeInput.value,
      attendanceInput.value
    );

    studentsList.push(student);
    saveStudents();
    renderStudent(student);
    updateStudentCount();
    studentForm.reset();
    reportBox.hidden = true;
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  }
});

committeeButton.addEventListener("click", () => {
  const studentsNeedingGrace = studentsList.filter(
    (student) => student.average >= 40 && student.average < 50
  );

  const adjustedStudents = studentsNeedingGrace.map((student) => ({
    name: student.name,
    adjustedAverage: student.average + 5
  }));

  const adjustedTotal = adjustedStudents.reduce(
    (total, student) => total + student.adjustedAverage,
    0
  );

  const overallAverage = adjustedStudents.length
    ? adjustedTotal / adjustedStudents.length
    : 0;

  reportBox.replaceChildren();
  reportBox.hidden = false;

  const heading = document.createElement("div");
  heading.className = "report-title";
  heading.innerHTML =
    `<span>تقرير لجنة الرأفة</span>` +
    `<span class="report-number">${formatNumber(adjustedStudents.length)} طالب</span>`;

  reportBox.append(heading);

  if (adjustedStudents.length === 0) {
    const message = document.createElement("p");
    message.className = "report-empty";
    message.textContent = studentsList.length
      ? "لا يوجد طلاب بمتوسط بين ٤٠ و٤٩ حالياً."
      : "لا يوجد طلاب في السجل بعد. أضف الطلاب أولاً لعرض تقرير اللجنة.";

    reportBox.append(message);
    return;
  }

  const list = document.createElement("div");
  list.className = "report-list";

  adjustedStudents.forEach((student) => {
    const row = document.createElement("div");
    row.className = "report-row";

    const studentName = document.createElement("span");
    studentName.textContent = student.name;

    const score = document.createElement("strong");
    score.textContent = `${formatNumber(student.adjustedAverage)}٪`;

    row.append(studentName, score);
    list.append(row);
  });

  reportBox.append(list);

  const summary = document.createElement("div");
  summary.className = "report-average";
  summary.innerHTML =
    `<span>المتوسط العام بعد الرأفة</span>` +
    `<strong>${formatNumber(overallAverage)}٪</strong>`;

  reportBox.append(summary);
});

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");

  themeIcon.textContent = isDark ? "☀" : "☾";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"
  );
  themeToggle.querySelector(".theme-label").textContent =
    isDark ? "الوضع الفاتح" : "الوضع الداكن";

  try {
    localStorage.setItem("results-theme", isDark ? "dark" : "light");
  } catch {
    // يظل تغيير الألوان يعمل لو تخزين المتصفح غير متاح.
  }
});

try {
  if (localStorage.getItem("results-theme") === "dark") {
    document.body.classList.add("dark");
    themeIcon.textContent = "☀";
    themeToggle.setAttribute("aria-label", "تفعيل الوضع الفاتح");
    themeToggle.querySelector(".theme-label").textContent = "الوضع الفاتح";
  }
} catch {
  // يستخدم الوضع الفاتح تلقائياً لو تخزين المتصفح غير متاح.
}

loadSavedStudents();

if (
  "serviceWorker" in navigator &&
  (location.protocol === "https:" || location.hostname === "localhost")
) {
  navigator.serviceWorker.register("./SW.js").catch(() => {
    // تظل الصفحة تعمل أونلاين لو تعذر تثبيت دعم الأوفلاين.
  });
}