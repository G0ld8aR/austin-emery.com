const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const input = document.getElementById("projectFilter");
const grid = document.getElementById("projectGrid");

if (input && grid) {
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    const cards = grid.querySelectorAll(".project");

    cards.forEach(card => {
      const text = (card.textContent || "").toLowerCase();
      const tags = (card.getAttribute("data-tags") || "").toLowerCase();
      const match = !q || text.includes(q) || tags.includes(q);
      card.style.display = match ? "" : "none";
    });
  });
}

const form = document.getElementById("contactForm");
const msg = document.getElementById("formMsg");

if (form && msg) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.textContent = "Received. Next step is wiring this to a form backend so it actually sends.";
    form.reset();
  });
}