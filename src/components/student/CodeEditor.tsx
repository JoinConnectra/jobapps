"use client";

import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";

type Props = {
  value: string;
  onChange: (next: string) => void;
  language?: "javascript" | "python" | "cpp";
  readOnly?: boolean;
  height?: string; // e.g. "300px"
};

export default function CodeEditor({
  value,
  onChange,
  language = "javascript",
  readOnly = false,
  height = "320px",
}: Props) {
  const extensions = React.useMemo(() => {
    switch (language) {
      case "python":
        return [python()];
      case "cpp":
        return [cpp()];
      default:
        // javascript(lang, jsx, typescript) flags default to plain JS
        return [javascript()];
    }
  }, [language]);

  return (
    <div className="rounded-md overflow-hidden border">
      <CodeMirror
        value={value}
        height={height}
        theme={oneDark}
        extensions={extensions}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          bracketMatching: true,
          autocompletion: true,
          indentOnInput: true,
          defaultKeymap: true,
          history: true,
        }}
        onChange={(val) => onChange(val)}
      />
    </div>
  );
}
