import {
  Braces,
  CircleDot,
  CircleX,
  FileCode,
  FileImage,
  FileText,
  Files,
  Minus,
  Siren,
  Terminal,
  type LucideIcon,
} from "lucide-react";

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Ruby: "#701516",
  PHP: "#4F5D95",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Shell: "#89e051",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Elixir: "#6e4a7e",
  Lua: "#000080",
  Scala: "#c22d40",
  TeX: "#3D6117",
  Makefile: "#427819",
  Dockerfile: "#384d54",
  Astro: "#ff5a03",
};

export const languageColor = (language: string | null) =>
  (language && languageColors[language]) || "#8b8d8f";

export const fileIcon = (filename: string): LucideIcon => {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "rb", "php", "c", "cpp", "cs", "swift", "kt", "dart", "vue", "svelte", "astro", "scala", "ex"].includes(extension)) {
    return FileCode;
  }
  if (["md", "txt", "rst", "adoc"].includes(extension)) return FileText;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(extension)) {
    return FileImage;
  }
  if (["json", "yaml", "yml", "toml", "xml", "lock"].includes(extension)) {
    return Braces;
  }
  if (["sh", "bash", "zsh", "fish", "ps1"].includes(extension)) return Terminal;
  return Files;
};

export const severityIcon = (severity: string): LucideIcon => {
  if (severity === "critical") return CircleX;
  if (severity === "high") return Siren;
  if (severity === "medium") return CircleDot;
  return Minus;
};
