import type { Root, RootContent } from "mdast";

export const ALERT_TYPES = ["note", "tip", "important", "warning", "caution"] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n)?/i;

type Parent = { children: RootContent[] };

function transform(node: Parent) {
  node.children.forEach((child, i) => {
    if (child.type === "blockquote") {
      const alert = toAlert(child);
      if (alert) {
        node.children[i] = alert;
        transform(alert as unknown as Parent);
        return;
      }
    }
    if ("children" in child) transform(child as unknown as Parent);
  });
}

function toAlert(quote: Extract<RootContent, { type: "blockquote" }>): RootContent | null {
  const first = quote.children[0];
  if (first?.type !== "paragraph") return null;
  const text = first.children[0];
  if (text?.type !== "text") return null;
  const match = MARKER.exec(text.value);
  if (!match) return null;

  text.value = text.value.slice(match[0].length);
  if (!text.value) first.children.shift();
  if (first.children.length === 0) quote.children.shift();

  return {
    type: "mdxJsxFlowElement",
    name: "Alert",
    attributes: [
      { type: "mdxJsxAttribute", name: "type", value: match[1].toLowerCase() },
    ],
    children: quote.children,
  } as unknown as RootContent;
}

export function remarkAlerts() {
  return (tree: Root) => transform(tree as unknown as Parent);
}
