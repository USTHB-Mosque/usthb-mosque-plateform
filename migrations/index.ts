import * as migration_20260918_094355 from './20260918_094355'
import * as migration_20260918_102126 from './20260918_102126'
import * as migration_20260920_092548_drop_mcp_plugin_tables from './20260920_092548_drop_mcp_plugin_tables'
import * as migration_20260920_104333_add_article_favorites from './20260920_104333_add_article_favorites'
import * as migration_20260920_114739_user_activity_log_hook_fix from './20260920_114739_user_activity_log_hook_fix'
import * as migration_20260922_095148_password_reset_email_config from './20260922_095148_password_reset_email_config'

export const migrations = [
  {
    up: migration_20260918_094355.up,
    down: migration_20260918_094355.down,
    name: '20260918_094355',
  },
  {
    up: migration_20260918_102126.up,
    down: migration_20260918_102126.down,
    name: '20260918_102126',
  },
  {
    up: migration_20260920_092548_drop_mcp_plugin_tables.up,
    down: migration_20260920_092548_drop_mcp_plugin_tables.down,
    name: '20260920_092548_drop_mcp_plugin_tables',
  },
  {
    up: migration_20260920_104333_add_article_favorites.up,
    down: migration_20260920_104333_add_article_favorites.down,
    name: '20260920_104333_add_article_favorites',
  },
  {
    up: migration_20260920_114739_user_activity_log_hook_fix.up,
    down: migration_20260920_114739_user_activity_log_hook_fix.down,
    name: '20260920_114739_user_activity_log_hook_fix',
  },
  {
    up: migration_20260922_095148_password_reset_email_config.up,
    down: migration_20260922_095148_password_reset_email_config.down,
    name: '20260922_095148_password_reset_email_config',
  },
]
