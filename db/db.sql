-- Таблица языков программирования (справочник)
CREATE TABLE IF NOT EXISTS programming_language (
    id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    PRIMARY KEY (id)
);

-- Таблица заявок (основные данные)
CREATE TABLE IF NOT EXISTS application (
    id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    biography TEXT,
    contract_accepted TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Таблица связи (заявка -> языки)
CREATE TABLE IF NOT EXISTS application_language (
    id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id INT(10) UNSIGNED NOT NULL,
    language_id INT(10) UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES programming_language(id) ON DELETE CASCADE,
    UNIQUE KEY unique_application_language (application_id, language_id)
);

-- Заполняем справочник языков
INSERT INTO programming_language (name) VALUES
('Pascal'), ('C'), ('C++'), ('JavaScript'), ('PHP'), ('Python'),
('Java'), ('Haskell'), ('Clojure'), ('Prolog'), ('Scala'), ('Go')
ON DUPLICATE KEY UPDATE name=name;