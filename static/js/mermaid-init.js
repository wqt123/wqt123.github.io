document.addEventListener("DOMContentLoaded", async () => {
  const blocks = document.querySelectorAll("pre code.language-mermaid");
  if (!blocks.length) return;

  const mermaidModule = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
  const mermaid = mermaidModule.default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose"
  });

  blocks.forEach((block, index) => {
    const pre = block.parentElement;
    const wrapper = document.createElement("div");
    wrapper.className = "mermaid";
    wrapper.id = `mermaid-${index}`;
    wrapper.textContent = block.textContent;
    pre.replaceWith(wrapper);
  });

  await mermaid.run({
    querySelector: ".mermaid"
  });
});
