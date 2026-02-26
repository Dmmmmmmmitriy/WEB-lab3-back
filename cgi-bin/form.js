#!/usr/bin/env node
/**
 * CGI-обработчик формы на NodeJS
 * Запуск: chmod +x form.js
 */

const mysql = require("mysql2/promise");
const querystring = require("querystring");
const fs = require("fs");
const path = require("path");

// ==================== КОНФИГУРАЦИЯ ====================
// Пытаемся загрузить конфиг из отдельного файла (безопасно для Git)
const configPath = path.join(__dirname, "config.json");
let dbConfig = {
  host: "localhost",
  database: "<dbname>", // Замените на ваш логин
  user: "<login>", // Замените на ваш логин
  password: "<pass>", // Замените на ваш пароль
};

if (fs.existsSync(configPath)) {
  try {
    const fileConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    dbConfig = { ...dbConfig, ...fileConfig };
  } catch (e) {
    console.error("Warning: Could not parse config.json");
  }
}

// Допустимые языки
const VALID_LANGUAGES = [
  "Pascal",
  "C",
  "C++",
  "JavaScript",
  "PHP",
  "Python",
  "Java",
  "Haskell",
  "Clojure",
  "Prolog",
  "Scala",
  "Go",
];

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// Чтение POST-данных из stdin
function readPostData() {
  return new Promise((resolve) => {
    const contentLength = parseInt(process.env.CONTENT_LENGTH || "0", 10);
    if (contentLength === 0) {
      resolve("");
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

// CGI-заголовки
function sendHeaders(contentType = "application/json") {
  console.log(`Content-Type: ${contentType}; charset=utf-8`);
  console.log("Access-Control-Allow-Origin: *");
  console.log(""); // Пустая строка обязательна!
}

// JSON-ответ
function sendJSON(data) {
  sendHeaders("application/json");
  console.log(JSON.stringify(data, null, 2));
}

// HTML-ответ
function sendHTML(html) {
  sendHeaders("text/html");
  console.log(html);
}

// Валидация данных
function validate(data) {
  const errors = [];

  // 1. ФИО
  if (!data.full_name || !data.full_name.trim()) {
    errors.push("Поле ФИО обязательно для заполнения");
  } else if (data.full_name.length > 150) {
    errors.push("ФИО не должно превышать 150 символов");
  } else if (!/^[а-яА-ЯёЁa-zA-Z\s\-]+$/u.test(data.full_name.trim())) {
    errors.push("ФИО должно содержать только буквы, пробелы и дефисы");
  }

  // 2. Телефон
  if (!data.phone || !data.phone.trim()) {
    errors.push("Поле Телефон обязательно для заполнения");
  } else if (!/^[\+]?[0-9\s\-\(\)]{10,20}$/.test(data.phone.trim())) {
    errors.push("Некорректный формат телефона");
  }

  // 3. Email
  if (!data.email || !data.email.trim()) {
    errors.push("Поле E-mail обязательно для заполнения");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push("Некорректный формат E-mail");
  }

  // 4. Дата рождения
  if (!data.birth_date) {
    errors.push("Поле Дата рождения обязательно для заполнения");
  } else {
    const date = new Date(data.birth_date);
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    if (age < 14) {
      errors.push("Минимальный возраст 14 лет");
    }
    if (date > today) {
      errors.push("Дата рождения не может быть в будущем");
    }
  }

  // 5. Пол
  if (!data.gender || !["male", "female"].includes(data.gender)) {
    errors.push("Выберите пол (мужской или женский)");
  }

  // 6. Языки
  const languages = Array.isArray(data.languages)
    ? data.languages
    : [data.languages].filter(Boolean);
  if (languages.length === 0) {
    errors.push("Выберите хотя бы один язык программирования");
  } else {
    for (const lang of languages) {
      if (!VALID_LANGUAGES.includes(lang)) {
        errors.push(`Недопустимый язык: ${lang}`);
        break;
      }
    }
  }

  // 7. Контракт
  if (!data.contract_accepted || data.contract_accepted !== "1") {
    errors.push("Необходимо принять условия контракта");
  }

  return { errors, isValid: errors.length === 0, languages };
}

// ==================== ОСНОВНАЯ ЛОГИКА ====================

async function main() {
  const method = process.env.REQUEST_METHOD || "GET";

  try {
    if (method === "GET") {
      // Отдаём HTML-форму
      const formPath = path.join(__dirname, "..", "public", "form.html");
      const html = fs.readFileSync(formPath, "utf8");
      sendHTML(html);
      return;
    }

    if (method === "POST") {
      // Читаем POST-данные
      const postData = await readPostData();
      const data = querystring.parse(postData);

      // Валидация
      const { errors, isValid, languages } = validate(data);

      if (!isValid) {
        sendJSON({ success: false, errors });
        return;
      }

      // Подключение к БД
      const connection = await mysql.createConnection(dbConfig);

      try {
        // Начало транзакции
        await connection.beginTransaction();

        // Вставка в application
        const [result] = await connection.execute(
          `INSERT INTO application (full_name, phone, email, birth_date, gender, biography, contract_accepted)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            data.full_name.trim(),
            data.phone.trim(),
            data.email.trim(),
            data.birth_date,
            data.gender,
            data.biography?.trim() || "",
            1,
          ],
        );

        const applicationId = result.insertId;

        // Вставка языков (получаем ID из справочника)
        for (const lang of languages) {
          await connection.execute(
            `INSERT INTO application_language (application_id, language_id)
                         SELECT ?, id FROM programming_language WHERE name = ?`,
            [applicationId, lang],
          );
        }

        // Коммит
        await connection.commit();

        sendJSON({
          success: true,
          message: "Данные успешно сохранены",
          applicationId,
        });
      } catch (dbError) {
        await connection.rollback();
        throw dbError;
      } finally {
        await connection.end();
      }
      return;
    }

    // Метод не поддерживается
    sendJSON({ success: false, errors: ["Метод не поддерживается"] });
  } catch (error) {
    console.error("CGI Error:", error);
    sendJSON({
      success: false,
      errors: [`Ошибка сервера: ${error.message}`],
    });
  }
}

main();
