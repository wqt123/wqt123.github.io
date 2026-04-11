import MarkdownIt from "https://cdn.jsdelivr.net/npm/markdown-it@14/+esm";
import markdownItFootnote from "https://cdn.jsdelivr.net/npm/markdown-it-footnote@4/+esm";
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

const container = document.querySelector("[data-markdown-source]");

if (container) {
  const source = container.getAttribute("data-markdown-source");
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false
  }).use(markdownItFootnote);

  const stripFrontMatter = (raw) =>
    raw
      .replace(/^\uFEFF/, "")
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
      .replace(/^\+\+\+\r?\n[\s\S]*?\r?\n\+\+\+\r?\n?/, "");

  const enhanceLinks = () => {
    container.querySelectorAll("a[href^='http']").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noreferrer");
    });
  };

  const renderMermaid = async () => {
    const blocks = container.querySelectorAll("pre code.language-mermaid");

    blocks.forEach((block) => {
      const pre = block.parentElement;
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid";
      wrapper.textContent = block.textContent;
      pre.replaceWith(wrapper);
    });

    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        primaryColor: "#d9f1ec",
        primaryTextColor: "#17312d",
        primaryBorderColor: "#0f766e",
        lineColor: "#55726b",
        secondaryColor: "#eef6f4",
        tertiaryColor: "#ffffff"
      }
    });

    const nodes = Array.from(container.querySelectorAll(".mermaid"));
    if (nodes.length > 0) {
      await mermaid.run({ nodes });
    }
  };

  const render = async () => {
    try {
      const response = await fetch(source, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`文章加载失败：${response.status}`);
      }

      const raw = await response.text();
      const body = stripFrontMatter(raw);
      container.innerHTML = md.render(body);
      enhanceLinks();
      await renderMermaid();
    } catch (error) {
      container.innerHTML = `
        <blockquote>
          文章暂时没有加载成功。<br>
          你也可以直接查看原始 Markdown：
          <a href="${source}">${source}</a>
        </blockquote>
      `;
      console.error(error);
    }
  };

  render();
}
