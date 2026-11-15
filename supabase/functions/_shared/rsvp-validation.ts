const MAX_ATTENDEES = 20;
const DIETARY_OPTIONS = new Set([
  "celiaquia",
  "vegetariana",
  "vegana",
  "diabetes",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AttendeeInput = {
  name: string;
  surname: string;
  age_at_event: number;
  after_lunch: boolean;
};

export type Submission = {
  request_id: string;
  contact_name: string;
  contact_surname: string;
  email: string;
  phone: string | null;
  attending: boolean;
  attendees: AttendeeInput[];
  observations: string | null;
  song_suggestion: string | null;
  dietary_restrictions: string[];
  dietary_details: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function normalizeOptionalText(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("invalid_input");
  const normalized = value.trim();
  if (
    normalized.length > maxLength || /[\u0000-\u001f\u007f]/u.test(normalized)
  ) {
    throw new Error("invalid_input");
  }
  return normalized || null;
}

function normalizeRequiredText(value: unknown, maxLength: number): string {
  const normalized = normalizeOptionalText(value, maxLength);
  if (!normalized) throw new Error("invalid_input");
  return normalized;
}

export function parseSubmission(value: unknown): Submission {
  if (
    !isRecord(value) || !hasOnlyKeys(value, [
      "request_id",
      "contact_name",
      "contact_surname",
      "email",
      "phone",
      "attending",
      "attendees",
      "observations",
      "song_suggestion",
      "dietary_restrictions",
      "dietary_details",
    ])
  ) {
    throw new Error("invalid_input");
  }

  if (
    typeof value.request_id !== "string" ||
    !UUID_PATTERN.test(value.request_id) ||
    typeof value.attending !== "boolean" ||
    !Array.isArray(value.attendees) ||
    value.attendees.length > MAX_ATTENDEES
  ) {
    throw new Error("invalid_input");
  }

  const email = normalizeRequiredText(value.email, 254).toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
    throw new Error("invalid_input");
  }

  const attendees = value.attendees.map((item): AttendeeInput => {
    if (
      !isRecord(item) || !hasOnlyKeys(item, [
        "name",
        "surname",
        "age_at_event",
        "after_lunch",
      ])
    ) {
      throw new Error("invalid_input");
    }
    if (
      !Number.isInteger(item.age_at_event) ||
      (item.age_at_event as number) < 0 ||
      (item.age_at_event as number) > 120 ||
      typeof item.after_lunch !== "boolean"
    ) {
      throw new Error("invalid_input");
    }
    return {
      name: normalizeRequiredText(item.name, 120),
      surname: normalizeRequiredText(item.surname, 120),
      age_at_event: item.age_at_event as number,
      after_lunch: item.after_lunch,
    };
  });

  if (value.attending && attendees.length === 0) {
    throw new Error("invalid_input");
  }
  if (!value.attending && attendees.length !== 0) {
    throw new Error("invalid_input");
  }
  if (!Array.isArray(value.dietary_restrictions)) {
    throw new Error("invalid_input");
  }

  const restrictions = value.dietary_restrictions;
  if (
    restrictions.length > DIETARY_OPTIONS.size ||
    restrictions.some((item) =>
      typeof item !== "string" || !DIETARY_OPTIONS.has(item)
    ) ||
    new Set(restrictions).size !== restrictions.length
  ) {
    throw new Error("invalid_input");
  }

  return {
    request_id: value.request_id,
    contact_name: normalizeRequiredText(value.contact_name, 120),
    contact_surname: normalizeRequiredText(value.contact_surname, 120),
    email,
    phone: normalizeOptionalText(value.phone, 50),
    attending: value.attending,
    attendees,
    observations: normalizeOptionalText(value.observations, 2000),
    song_suggestion: normalizeOptionalText(value.song_suggestion, 200),
    dietary_restrictions: restrictions as string[],
    dietary_details: normalizeOptionalText(value.dietary_details, 500),
  };
}
