-- 个人默认语言改为跟随站点默认（null=未设置，随站点 defaultLocale 变化）
-- 个人显式设置语言后（profile 弹窗）该列存具体值（如 'en'/'cn'）覆盖站点默认
ALTER TABLE "users" ALTER COLUMN "default_locale" DROP DEFAULT;