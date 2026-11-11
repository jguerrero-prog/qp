import { Button, CodeBlock } from "@ui";
import { FunctionComponent, useEffect, useState } from "react";

const LANGUAGES: Record<string, "python" | "shell"> = {
  python: "python",
  py: "python",
  shell: "shell",
  sh: "shell",
  bash: "shell",
  console: "shell",
  zsh: "shell",
};

const NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  yaml: "YAML",
  yml: "YAML",
};

interface CodeProps {
  code: string;
  language?: string;
  title?: string;
}

/** @ui CodeBlock for Python and shell; other code gets the same look without highlighting. */
const Code: FunctionComponent<CodeProps> = ({ code, language, title }) => {
  const known = language ? LANGUAGES[language.toLowerCase()] : undefined;
  if (known) return <CodeBlock code={code} language={known} title={title} />;
  const name = language && (NAMES[language.toLowerCase()] ?? language);
  return <PlainCode code={code} name={title ?? name ?? "Code"} />;
};

const PlainCode: FunctionComponent<{ code: string; name: string }> = ({
  code,
  name,
}) => {
  const [copied, setCopied] = useState<boolean | "failed">(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = () =>
    navigator.clipboard.writeText(code).then(
      () => setCopied(true),
      () => setCopied("failed"),
    );
  return (
    <figure className="ns-code-block">
      <div className="ns-code-header">
        <span className="ns-code-name">{name}</span>
        <Button
          size="sm"
          variant="ghost"
          icon={copied === true ? "checkmark" : "copy"}
          aria-label={copied === true ? "Copied" : `Copy ${name}`}
          onClick={copy}
        >
          {copied === true ? "Copied" : "Copy"}
        </Button>
        <span role="status" className="ns-visually-hidden">
          {copied === true
            ? "Copied"
            : copied === "failed"
              ? "Couldn’t copy. Select the text and copy it."
              : ""}
        </span>
      </div>
      <pre className="ns-code-body">
        <code>
          {code.split("\n").map((line, index) => (
            <span key={index} className="ns-code-line">
              <span className="ns-code-text">{line}</span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
};

export default Code;
