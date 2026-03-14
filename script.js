document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const feedback = document.getElementById("contact-feedback");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const message = [
      `Name: ${(data.get("name") || "").toString().trim()}`,
      `Email: ${(data.get("email") || "").toString().trim()}`,
      `Subject: ${(data.get("subject") || "").toString().trim()}`,
      "",
      (data.get("message") || "").toString().trim()
    ].join("
");

    try {
      await navigator.clipboard.writeText(message);
      if (feedback) feedback.textContent = "Message copied. You can paste it into LinkedIn or any contact method you want to use.";
    } catch (error) {
      if (feedback) feedback.textContent = "Copy did not work automatically. You can still highlight the text and copy it manually.";
    }
  });
});
