-- ============================================================
-- RESET: borra todos los objetos de Mr. Chavez's Hub antes de
-- volver a correr schema.sql desde cero. Solo úsalo si NO tienes
-- datos reales todavía — esto elimina todas las tablas y su contenido.
-- Corre este archivo primero, y luego vuelve a correr schema.sql completo.
-- ============================================================

drop function if exists redeem_reward(uuid) cascade;
drop function if exists claim_student_account(uuid, text) cascade;
drop function if exists claim_teacher_account() cascade;
drop function if exists my_student_id() cascade;
drop function if exists is_teacher() cascade;

drop view if exists roster_public cascade;

drop table if exists project_results cascade;
drop table if exists project_criteria cascade;
drop table if exists projects cascade;
drop table if exists scores cascade;
drop table if exists task_results cascade;
drop table if exists tasks cascade;
drop table if exists attendance cascade;
drop table if exists transactions cascade;
drop table if exists reward_purchases cascade;
drop table if exists rewards cascade;
drop table if exists profiles cascade;
drop table if exists students cascade;
drop table if exists app_config cascade;
