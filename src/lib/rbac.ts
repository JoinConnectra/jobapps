export function requireStudent(user: { role?: string; accountType?: string } | null | undefined) {
  // accept either role === 'student' OR accountType === 'applicant' per your schema default
  if (!user || !(['student', 'applicant'].includes(String(user.role ?? user.accountType ?? '')))) {
    const err = new Error("Forbidden");
    // @ts-ignore
    err.status = 403;
    throw err;
  }
}
