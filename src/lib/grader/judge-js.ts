// src/lib/grader/judge-js.ts
// Lightweight JS grader using Node's vm (no vm2).
// Supports tests:
//  A) { args: [...], output: <expected> }
//  B) { input: "<possibly multi-line>", output: "<expected>" }  // parse input -> args
//
// Comparison rules:
//  - If result is Array and expected looks like "0 1", we join(" ") before compare
//  - Else compare JSON.stringify(result) vs JSON.stringify(parsedExpected) when expected is JSON-y
//  - Else plain string compare

import vm from "node:vm";

export type JsTest =
  | { args: any[]; output: any }
  | { input: string; output: any };

export type JsOptions = {
  entryPoint?: string;      // e.g. "twoSum"
  timeoutMs?: number;       // default 1500
};

function parseArgsFromInput(input: string): any[] {
  const lines = input.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const args: any[] = [];
  for (const line of lines) {
    try {
      args.push(JSON.parse(line));
    } catch {
      const num = Number(line);
      args.push(Number.isFinite(num) ? num : line);
    }
  }
  return args;
}

function looksJson(s: string) {
  return typeof s === "string" && /^[\[{"]/.test(s.trim());
}

export function normalizeResultForCompare(result: any, expectedRaw: any) {
  if (Array.isArray(result) && typeof expectedRaw === "string" && expectedRaw.includes(" ")) {
    return result.join(" ");
  }
  return result;
}

export function normalizeExpected(expectedRaw: any) {
  if (typeof expectedRaw === "string" && looksJson(expectedRaw)) {
    try { return JSON.parse(expectedRaw); } catch {}
  }
  return expectedRaw;
}

export async function gradeJsCode(
  userCode: string,
  tests: JsTest[],
  options: JsOptions = {}
): Promise<{ passed: number; total: number; details: { ok: boolean; got: any; want: any }[] }> {
  const timeoutMs = options.timeoutMs ?? 1500;
  const entry = options.entryPoint ?? "solution";

  // Isolated context with a minimal global
  const outputs: string[] = [];
  const context = vm.createContext({
    console: {
      log: (...a: any[]) => outputs.push(a.join(" ")),
      error: () => {},
      warn: () => {},
    },
    module: { exports: {} },
    exports: {},
    global: {},   // prevent accidental access to host global
  });

  // Compile & run user code
  const script = new vm.Script(userCode, { filename: "user-code.js" });
  script.runInContext(context, { timeout: timeoutMs });

  // Resolve callable function
  let fn: any;
  try {
    fn = vm.runInContext(
      `typeof ${entry} === 'function' ? ${entry} : (module && module.exports ? module.exports : (exports && exports.default))`,
      context,
      { timeout: 50 }
    );
  } catch { /* ignore */ }

  if (typeof fn !== "function") {
    try {
      fn = vm.runInContext(
        `(exports && exports.${entry}) || (module && module.exports && module.exports.${entry})`,
        context,
        { timeout: 50 }
      );
    } catch { /* ignore */ }
  }

  const results: { ok: boolean; got: any; want: any }[] = [];
  let passed = 0;

  for (const t of tests) {
    try {
      const args = Array.isArray((t as any).args)
        ? (t as any).args
        : parseArgsFromInput((t as any).input ?? "");

      const want = normalizeExpected((t as any).output);

      let got: any;

      if (typeof fn === "function") {
        const callSrc = `
          (function(){
            const f = __fn__;
            return f(...__args__);
          })()
        `;
        const callScript = new vm.Script(callSrc);
        (context as any).__fn__ = fn;
        (context as any).__args__ = args;
        got = callScript.runInContext(context, { timeout: timeoutMs });
        delete (context as any).__fn__;
        delete (context as any).__args__;
      } else {
        results.push({ ok: false, got: undefined, want });
        continue;
      }

      const gotNorm = normalizeResultForCompare(got, (t as any).output);
      const ok =
        JSON.stringify(gotNorm) === JSON.stringify(want) ||
        String(gotNorm) === String(want);

      if (ok) passed++;
      results.push({ ok, got: gotNorm, want });
    } catch (e) {
      results.push({ ok: false, got: String(e), want: (t as any).output });
    }
  }

  return { passed, total: tests.length, details: results };
}
