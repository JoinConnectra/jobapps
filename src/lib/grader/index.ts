// src/lib/grader/index.ts
import { gradeJsCode } from "./judge-js";

export type GradeInput = {
  language: "javascript" | "python" | "cpp";
  code: string;
  tests: any[];
  options?: { entryPoint?: string; timeoutMs?: number; points?: number };
};

export async function gradeCode({ language, code, tests, options }: GradeInput) {
  if (language === "javascript") {
    const res = await gradeJsCode(code, tests, {
      entryPoint: options?.entryPoint,
      timeoutMs: options?.timeoutMs,
    });
    const points = options?.points ?? 1;
    const earned = Math.round((res.passed / Math.max(1, res.total)) * points);
    return { ok: true, earned, possible: points, detail: res };
  }

  // TODO: wire Python/C++ via Judge0 or an internal sandbox later.
  return { ok: false, earned: 0, possible: options?.points ?? 1, detail: { msg: "Language not yet supported" } };
}
