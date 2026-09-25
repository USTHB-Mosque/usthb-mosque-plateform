import * as migration_20260918_094355 from './20260918_094355'
import * as migration_20260918_102126 from './20260918_102126'
import * as migration_20260920_092548_drop_mcp_plugin_tables from './20260920_092548_drop_mcp_plugin_tables'
import * as migration_20260920_104333_add_article_favorites from './20260920_104333_add_article_favorites'
import * as migration_20260920_114739_user_activity_log_hook_fix from './20260920_114739_user_activity_log_hook_fix'
import * as migration_20260921_204730_add_extension_request_to_loans from './20260921_204730_add_extension_request_to_loans'
import * as migration_20260922_092238_add_first_admin_created_action from './20260922_092238_add_first_admin_created_action'
import * as migration_20260922_095148_password_reset_email_config from './20260922_095148_password_reset_email_config'
import * as migration_20260922_124852_reset_email_origin_config from './20260922_124852_reset_email_origin_config'
import * as migration_20260922_194450_add_librarian_role_and_book_deleted_at from './20260922_194450_add_librarian_role_and_book_deleted_at'
import * as migration_20260923_112156_add_notifications_collection from './20260923_112156_add_notifications_collection'
import * as migration_20260923_212106_loan_lifecycle_phase_1 from './20260923_212106_loan_lifecycle_phase_1'
import * as migration_20260924_000000_book_type_has_many from './20260924_000000_book_type_has_many'
import * as migration_20260924_000001_drop_extension_request_from_loans from './20260924_000001_drop_extension_request_from_loans'
import * as migration_20260924_100000_add_admin_notification_preferences from './20260924_100000_add_admin_notification_preferences'
import * as migration_20260925_000000_phase_2_data_layer from './20260925_000000_phase_2_data_layer'

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
    up: migration_20260921_204730_add_extension_request_to_loans.up,
    down: migration_20260921_204730_add_extension_request_to_loans.down,
    name: '20260921_204730_add_extension_request_to_loans',
  },
  {
    up: migration_20260922_092238_add_first_admin_created_action.up,
    down: migration_20260922_092238_add_first_admin_created_action.down,
    name: '20260922_092238_add_first_admin_created_action',
  },
  {
    up: migration_20260922_095148_password_reset_email_config.up,
    down: migration_20260922_095148_password_reset_email_config.down,
    name: '20260922_095148_password_reset_email_config',
  },
  {
    up: migration_20260922_124852_reset_email_origin_config.up,
    down: migration_20260922_124852_reset_email_origin_config.down,
    name: '20260922_124852_reset_email_origin_config',
  },
  {
    up: migration_20260922_194450_add_librarian_role_and_book_deleted_at.up,
    down: migration_20260922_194450_add_librarian_role_and_book_deleted_at.down,
    name: '20260922_194450_add_librarian_role_and_book_deleted_at',
  },
  {
    up: migration_20260923_112156_add_notifications_collection.up,
    down: migration_20260923_112156_add_notifications_collection.down,
    name: '20260923_112156_add_notifications_collection',
  },
  {
    up: migration_20260923_212106_loan_lifecycle_phase_1.up,
    down: migration_20260923_212106_loan_lifecycle_phase_1.down,
    name: '20260923_212106_loan_lifecycle_phase_1',
  },
  {
    up: migration_20260924_000000_book_type_has_many.up,
    down: migration_20260924_000000_book_type_has_many.down,
    name: '20260924_000000_book_type_has_many',
  },
  {
    up: migration_20260924_000001_drop_extension_request_from_loans.up,
    down: migration_20260924_000001_drop_extension_request_from_loans.down,
    name: '20260924_000001_drop_extension_request_from_loans',
  },
  {
    up: migration_20260924_100000_add_admin_notification_preferences.up,
    down: migration_20260924_100000_add_admin_notification_preferences.down,
    name: '20260924_100000_add_admin_notification_preferences',
  },
  {
    up: migration_20260925_000000_phase_2_data_layer.up,
    down: migration_20260925_000000_phase_2_data_layer.down,
    name: '20260925_000000_phase_2_data_layer',
  },
]
