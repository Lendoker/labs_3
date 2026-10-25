function showErrors(form, messages) {
    const box = form.querySelector("#client-errors");
    if (!box) return;
    if (!messages.length) {
        box.hidden = true;
        box.textContent = "";
        return;
    }
    box.hidden = false;
    box.textContent = messages.join(". ");
}

const bookForm = document.getElementById("book-form");
if (bookForm) {
    bookForm.addEventListener("submit", function (event) {
        const messages = [];
        const isbn = bookForm.isbn.value.trim();
        const year = Number(bookForm.year.value);
        const pages = Number(bookForm.pages.value);
        const copies = Number(bookForm.copies.value);
        if (!/^978-\d{3}-\d{2}-\d{4}-\d$/.test(isbn)) {
            messages.push("ISBN має вигляд 978-966-01-0001-1");
        }
        if (!bookForm.title.value.trim()) messages.push("Вкажіть назву");
        if (year < 1450 || year > 2026) messages.push("Рік видання поза діапазоном");
        if (pages < 1 || pages > 10000) messages.push("Некоректна кількість сторінок");
        if (copies < 1 || copies > 1000) messages.push("Некоректний тираж");
        if (messages.length) event.preventDefault();
        showErrors(bookForm, messages);
    });
}

const registerForm = document.getElementById("register-form");
if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
        const messages = [];
        if (!/^[A-Za-z0-9._-]{3,50}$/.test(registerForm.username.value.trim())) {
            messages.push("Логін: латиниця, цифри, крапка, 3–50 символів");
        }
        if (registerForm.password.value.length < 6) messages.push("Пароль коротший за 6 символів");
        if (!registerForm.full_name.value.trim()) messages.push("Вкажіть ПІБ");
        if (messages.length) event.preventDefault();
        showErrors(registerForm, messages);
    });
}
