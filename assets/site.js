// PlayAzerothSurvivors — 零依赖小脚本：FAQ 手风琴全部展开/收起（无 JS 时手风琴仍可用）
document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-faq]");
  if (!b) return;
  var mode = b.getAttribute("data-faq"); // "open" | "close"
  document.querySelectorAll("details.faq").forEach(function (d) {
    d.open = (mode === "open");
  });
});
