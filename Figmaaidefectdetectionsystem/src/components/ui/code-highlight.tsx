import { cn } from "./utils";

type Token = {
  text: string;
  className?: string;
};

const tokenRegex = /"[^"]*"|'[^']*'|\$[A-Za-z0-9_]+|\b\d+\b/g;

const splitComment = (line: string) => {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "'" && !inDouble) inSingle = !inSingle;
    if (char === '"' && !inSingle) inDouble = !inDouble;
    if (char === "#" && !inSingle && !inDouble) {
      return { code: line.slice(0, i), comment: line.slice(i) };
    }
  }
  return { code: line, comment: "" };
};

const tokenizeLine = (line: string): Token[] => {
  const { code, comment } = splitComment(line);
  const tokens: Token[] = [];
  const leadingMatch = code.match(/^\s*/);
  const leading = leadingMatch ? leadingMatch[0] : "";
  const remainder = code.slice(leading.length);
  tokens.push({ text: leading });

  const directiveMatch = remainder.match(/^[A-Za-z_][\w-]*/);
  if (directiveMatch) {
    const directive = directiveMatch[0];
    tokens.push({ text: directive, className: "text-primary" });
    tokens.push(
      ...tokenizeChunk(remainder.slice(directive.length)),
    );
  } else {
    tokens.push(...tokenizeChunk(remainder));
  }

  if (comment) {
    tokens.push({ text: comment, className: "text-muted-foreground italic" });
  }
  return tokens;
};

const tokenizeChunk = (chunk: string): Token[] => {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of chunk.matchAll(tokenRegex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: chunk.slice(lastIndex, index) });
    }
    const value = match[0];
    let className = "text-foreground";
    if (value.startsWith("$")) {
      className = "text-emerald-400";
    } else if (value.startsWith("'") || value.startsWith('"')) {
      className = "text-amber-400";
    } else {
      className = "text-sky-400";
    }
    tokens.push({ text: value, className });
    lastIndex = index + value.length;
  }
  if (lastIndex < chunk.length) {
    tokens.push({ text: chunk.slice(lastIndex) });
  }
  return tokens;
};

type CodeHighlightProps = {
  code: string;
  className?: string;
};

export const CodeHighlight = ({ code, className }: CodeHighlightProps) => {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  return (
    <pre
      className={cn(
        "text-xs bg-muted/30 border border-border rounded-lg p-4 overflow-auto",
        className,
      )}
    >
      <code className="block font-mono leading-relaxed">
        {lines.map((line, index) => (
          <div key={`line-${index}`} className="whitespace-pre">
            {tokenizeLine(line).map((token, tokenIndex) => (
              <span key={`token-${index}-${tokenIndex}`} className={token.className}>
                {token.text}
              </span>
            ))}
          </div>
        ))}
      </code>
    </pre>
  );
};
