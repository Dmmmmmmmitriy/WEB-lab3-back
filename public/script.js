// Клиентская валидация + отправка формы через Fetch API
document
  .getElementById("appForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = this;
    const messageDiv = document.getElementById("message");
    const submitBtn = form.querySelector(".btn-submit");

    // Блокируем кнопку
    submitBtn.disabled = true;
    submitBtn.textContent = "Отправка...";

    try {
      const formData = new FormData(form);

      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        messageDiv.className = "success";
        messageDiv.innerHTML = `<strong>Успешно!</strong> ${result.message} (ID: ${result.applicationId})`;
        form.reset();
      } else {
        messageDiv.className = "error";
        messageDiv.innerHTML = `<strong>Ошибка!</strong> ${result.errors.join("<br>")}`;
      }
    } catch (error) {
      messageDiv.className = "error";
      messageDiv.innerHTML = `<strong>Ошибка!</strong> Не удалось отправить данные`;
      console.error(error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "💾 Сохранить";
    }
  });
