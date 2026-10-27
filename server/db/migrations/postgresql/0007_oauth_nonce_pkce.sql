-- OIDC 增强：授权码表补 nonce 与 PKCE challenge
-- nonce：OIDC 客户端（SurveyKing 等）会校验 id_token 里的 nonce 与授权请求一致
-- code_challenge：PKCE（S256），换 token 时校验 code_verifier
ALTER TABLE "oauth_codes" ADD COLUMN IF NOT EXISTS "nonce" varchar(128);
ALTER TABLE "oauth_codes" ADD COLUMN IF NOT EXISTS "code_challenge" varchar(128);
