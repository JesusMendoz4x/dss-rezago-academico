-- Esquema inicial para MySQL 8.4. No contiene datos personales ni semillas.
CREATE DATABASE IF NOT EXISTS dss_rezago_academico
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE dss_rezago_academico;

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(6) PRIMARY KEY,
  group_code VARCHAR(40) NOT NULL,
  program VARCHAR(120) NOT NULL,
  CONSTRAINT chk_student_code CHECK (REGEXP_LIKE(id, '^E-[0-9]{4}$', 'c'))
);

CREATE TABLE IF NOT EXISTS import_batches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cutoff_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
  source_manifest JSON NOT NULL,
  quality_report JSON,
  CONSTRAINT chk_period CHECK (period_start <= cutoff_date AND cutoff_date <= period_end)
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id VARCHAR(6) NOT NULL,
  session_date DATE NOT NULL,
  attended TINYINT NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  source_row INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_attendance (batch_id, student_id, session_date),
  FOREIGN KEY (batch_id) REFERENCES import_batches(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT chk_attended CHECK (attended IN (0,1))
);

CREATE TABLE IF NOT EXISTS evaluations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id VARCHAR(6) NOT NULL,
  evaluation_code VARCHAR(80) NOT NULL,
  evaluation_date DATE NOT NULL,
  grade DECIMAL(4,2) NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  source_row INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_evaluation (batch_id, student_id, evaluation_code),
  FOREIGN KEY (batch_id) REFERENCES import_batches(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT chk_grade CHECK (grade BETWEEN 0 AND 10)
);

CREATE TABLE IF NOT EXISTS submissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id VARCHAR(6) NOT NULL,
  activity_code VARCHAR(80) NOT NULL,
  due_date DATE NOT NULL,
  submitted TINYINT NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  source_row INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_submission (batch_id, student_id, activity_code),
  FOREIGN KEY (batch_id) REFERENCES import_batches(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT chk_submitted CHECK (submitted IN (0,1))
);

CREATE TABLE IF NOT EXISTS data_anomalies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  source_row INT UNSIGNED NOT NULL,
  field_name VARCHAR(80),
  original_value TEXT,
  normalized_value TEXT,
  action ENUM('rejected','corrected','duplicate','conflict') NOT NULL,
  reason TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE TABLE IF NOT EXISTS analysis_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cutoff_date DATE NOT NULL,
  config_version VARCHAR(40) NOT NULL,
  config_snapshot JSON NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id BIGINT UNSIGNED NOT NULL,
  student_id VARCHAR(6) NOT NULL,
  risk_index DECIMAL(9,6),
  risk_level ENUM('alto','medio','bajo','sin_dictamen') NOT NULL,
  risk_type ENUM('asistencia','academico','mixto','general','sin_predominio'),
  suggested_action TEXT NOT NULL,
  indicators JSON NOT NULL,
  partial_risks JSON NOT NULL,
  contributions JSON NOT NULL,
  input_snapshot JSON NOT NULL,
  source_references JSON NOT NULL,
  explanation TEXT NOT NULL,
  warnings JSON NOT NULL,
  UNIQUE KEY uq_run_student (run_id, student_id),
  FOREIGN KEY (run_id) REFERENCES analysis_runs(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT chk_risk_index CHECK (risk_index IS NULL OR risk_index BETWEEN 0 AND 100),
  CONSTRAINT chk_verdict CHECK (
    (risk_level = 'sin_dictamen' AND risk_index IS NULL) OR
    (risk_level <> 'sin_dictamen' AND risk_index IS NOT NULL)
  )
);
