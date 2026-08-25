export type StudentCsvRow = {
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  publicName?: string;
  grade: string;
  className: string;
  status: "active" | "inactive";
};

export type StudentCsvValidation = {
  rows: StudentCsvRow[];
  errors: Array<{ line: number; message: string }>;
  duplicateEnrollmentNumbers: string[];
};

function splitLine(line: string, separator: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const current = line[index];
    if (current === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (current === separator && !quoted) {
      values.push(value.trim()); value = "";
    } else value += current;
  }
  values.push(value.trim());
  return values;
}

function normalizeHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const aliases: Record<string, string[]> = {
  enrollmentNumber: ["enrollmentnumber", "enrolmentnumber", "matricula", "registration", "studentid"],
  name: ["name", "nome", "studentname"],
  firstName: ["firstname", "primeironome"],
  lastName: ["lastname", "sobrenome", "surname"],
  publicName: ["publicname", "nomepublico", "nickname", "apelido"],
  grade: ["grade", "serie", "year", "ano"],
  className: ["class", "turma", "group"],
  status: ["status", "situacao"],
};

function cell(row: string[], headers: string[], field: keyof typeof aliases) {
  const position = headers.findIndex(header => aliases[field].includes(header));
  return position >= 0 ? (row[position] || "").trim() : "";
}

export function validateStudentCsv(content: string): StudentCsvValidation {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { rows: [], errors: [{ line: 1, message: "The file must include a header and at least one student row." }], duplicateEnrollmentNumbers: [] };
  const separator = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const headers = splitLine(lines[0], separator).map(normalizeHeader);
  const rows: StudentCsvRow[] = [];
  const errors: StudentCsvValidation["errors"] = [];
  const seen = new Set<string>();
  const duplicateEnrollmentNumbers = new Set<string>();

  lines.slice(1).forEach((line, index) => {
    const lineNumber = index + 2;
    const values = splitLine(line, separator);
    const enrollmentNumber = cell(values, headers, "enrollmentNumber");
    const fullName = cell(values, headers, "name");
    const firstName = cell(values, headers, "firstName") || fullName.split(/\s+/)[0] || "";
    const lastName = cell(values, headers, "lastName") || fullName.split(/\s+/).slice(1).join(" ") || "";
    const grade = cell(values, headers, "grade");
    const className = cell(values, headers, "className");
    const rawStatus = cell(values, headers, "status").toLowerCase();
    const status = ["inactive", "inativo"].includes(rawStatus) ? "inactive" : "active";
    if (!enrollmentNumber || !firstName || !lastName || !grade || !className) {
      errors.push({ line: lineNumber, message: "Required values: enrollment number, full name, grade and class." });
      return;
    }
    if (seen.has(enrollmentNumber)) duplicateEnrollmentNumbers.add(enrollmentNumber);
    seen.add(enrollmentNumber);
    rows.push({ enrollmentNumber, firstName, lastName, publicName: cell(values, headers, "publicName") || undefined, grade, className, status });
  });
  return { rows, errors, duplicateEnrollmentNumbers: Array.from(duplicateEnrollmentNumbers) };
}
