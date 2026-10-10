import type { ReactNode } from "react";

import type { PageDoc } from "../../schema";

type JsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: JsonNode[];
};

/**
 * Server-renderable picture of a document, using the editor's own CSS. Shown until the
 * editor mounts so the page reads on first paint.
 */
export function DocPreview({
  doc,
  pageTitle,
}: {
  doc: PageDoc | null;
  pageTitle: (id: string) => string | null;
}) {
  const nodes = (doc?.content ?? []) as JsonNode[];
  return (
    <div className="ws-prose" aria-busy>
      {nodes.length ? nodes.map((n, i) => renderNode(n, i, pageTitle)) : <p />}
    </div>
  );
}

function renderChildren(node: JsonNode, pageTitle: (id: string) => string | null) {
  return (node.content ?? []).map((c, i) => renderNode(c, i, pageTitle));
}

function renderNode(
  node: JsonNode,
  key: number,
  pageTitle: (id: string) => string | null,
): ReactNode {
  const kids = () => renderChildren(node, pageTitle);
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{kids()}</p>;
    case "heading": {
      const level = Number(node.attrs?.level) || 1;
      return level === 1 ? (
        <h1 key={key}>{kids()}</h1>
      ) : level === 2 ? (
        <h2 key={key}>{kids()}</h2>
      ) : (
        <h3 key={key}>{kids()}</h3>
      );
    }
    case "bulletList":
      return <ul key={key}>{kids()}</ul>;
    case "orderedList":
      return <ol key={key}>{kids()}</ol>;
    case "listItem":
      return <li key={key}>{kids()}</li>;
    case "taskList":
      return (
        <ul key={key} data-type="taskList">
          {kids()}
        </ul>
      );
    case "taskItem":
      return (
        <li key={key} data-type="taskItem" data-checked={Boolean(node.attrs?.checked)}>
          <label>
            <input type="checkbox" checked={Boolean(node.attrs?.checked)} readOnly tabIndex={-1} />
          </label>
          <div>{kids()}</div>
        </li>
      );
    case "blockquote":
      return <blockquote key={key}>{kids()}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{kids()}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "callout":
      return (
        <div key={key} data-type="callout" data-emoji={String(node.attrs?.emoji ?? "💡")}>
          {kids()}
        </div>
      );
    case "pageLink": {
      const title = typeof node.attrs?.id === "string" ? pageTitle(node.attrs.id) : null;
      return (
        <div key={key} data-type="page-link" className="my-1 px-2 py-1.5 text-[15.5px] font-medium">
          {title ?? "Deleted page"}
        </div>
      );
    }
    case "text":
      return <TextRun key={key} node={node} />;
    default:
      return null;
  }
}

function TextRun({ node }: { node: JsonNode }) {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong>{out}</strong>;
    else if (mark.type === "italic") out = <em>{out}</em>;
    else if (mark.type === "underline") out = <u>{out}</u>;
    else if (mark.type === "strike") out = <s>{out}</s>;
    else if (mark.type === "code") out = <code>{out}</code>;
    else if (mark.type === "highlight") out = <mark>{out}</mark>;
    else if (mark.type === "link" && typeof mark.attrs?.href === "string") {
      const href = /^(https?:|mailto:|tel:)/i.test(mark.attrs.href) ? mark.attrs.href : undefined;
      out = <a href={href}>{out}</a>;
    }
  }
  return <>{out}</>;
}
