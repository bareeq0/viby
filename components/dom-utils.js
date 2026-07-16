/** Safe text → HTML and lightweight assistant markdown (**bold**). */

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function stripMarkdown(text) {
  return String(text ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

export function parseBoldMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const frag = document.createDocumentFragment();
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = part.slice(2, -2);
      frag.appendChild(strong);
    } else if (part.includes("\n")) {
      const lines = part.split("\n");
      lines.forEach((line, index) => {
        if (line) frag.appendChild(document.createTextNode(line));
        if (index < lines.length - 1) frag.appendChild(document.createElement("br"));
      });
    } else if (part) {
      frag.appendChild(document.createTextNode(part));
    }
  }
  return frag;
}
