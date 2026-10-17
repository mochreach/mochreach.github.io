// Video library: topic chips, kind toggles, search, and "show all". Without JS every video is listed.
(() => {
  const grid = document.querySelector("[data-grid]");
  if (!grid) return;
  const cards = [...grid.children];
  const filters = document.querySelector("[data-filters]");
  const search = document.querySelector("[data-search]");
  const more = document.querySelector("[data-more]");
  const empty = document.querySelector("[data-empty]");
  const FIRST = 12;
  let topic = "", kind = "", query = "", expanded = false;

  filters.hidden = false;

  function update() {
    const filtering = topic || kind || query;
    let shown = 0, matches = 0;
    for (const card of cards) {
      const ok = (!topic || card.dataset.topics.split("|").includes(topic))
        && (!kind || card.dataset.kind === kind)
        && (!query || card.dataset.search.includes(query));
      if (ok) matches++;
      const visible = ok && (filtering || expanded || matches <= FIRST);
      card.hidden = !visible;
      if (visible) shown++;
    }
    empty.hidden = matches > 0;
    more.hidden = filtering || expanded || matches <= FIRST;
    more.textContent = `Show all ${matches} videos`;
  }

  function group(selector, attr, set) {
    const buttons = filters.querySelectorAll(selector);
    buttons.forEach((b) => b.addEventListener("click", () => {
      buttons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      set(b.dataset[attr]);
      update();
    }));
  }
  group(".chip", "topic", (v) => { topic = v; });
  group(".kind", "kind", (v) => { kind = v; });
  search.addEventListener("input", () => { query = search.value.trim().toLowerCase(); update(); });
  more.addEventListener("click", () => { expanded = true; update(); });

  update();
})();
