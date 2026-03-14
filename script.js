document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const feedback = document.getElementById("contact-feedback");
  const clearButton = document.getElementById("clear-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const lines = [
      `Name: ${(data.get("name") || "").toString().trim()}`,
      `Email: ${(data.get("email") || "").toString().trim()}`,
      `Subject: ${(data.get("subject") || "").toString().trim()}`,
      "",
      (data.get("message") || "").toString().trim()
    ];
    const message = lines.join("
");

    try {
      await navigator.clipboard.writeText(message);
      if (feedback) feedback.textContent = "Message copied. Paste it into LinkedIn or your preferred contact method.";
    } catch (error) {
      if (feedback) feedback.textContent = "Copy did not work automatically. You can still select the text and copy it manually.";
    }
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.setTimeout(() => {
        if (feedback) feedback.textContent = "";
      }, 0);
    });
  }
});
