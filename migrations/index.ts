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
import * as migration_20260925_100000_phase_2_admin_screens from './20260925_100000_phase_2_admin_screens'
import * as migration_20260928_000000_book_requests from './20260928_000000_book_requests'
import * as migration_20260928_010000_payload_jobs from './20260928_010000_payload_jobs'
import * as migration_20260928_020000_user_consent_required from './20260928_020000_user_consent_required'
import * as migration_20260929_000000_review_aggregates from './20260929_000000_review_aggregates'
import * as migration_20260929_000000_notification_coverage from './20260929_000000_notification_coverage'
import * as migration_20260929_010000_notification_event_key from './20260929_010000_notification_event_key'
import * as migration_20260930_000000_loan_pickup_window from './20260930_000000_loan_pickup_window'
import * as migration_20260930_010000_pickup_window_enums from './20260930_010000_pickup_window_enums'
import * as migration_20260930_020000_backfill_pickup_window from './20260930_020000_backfill_pickup_window'
import * as migration_20260930_030000_member_cancellation from './20260930_030000_member_cancellation'
import * as migration_20260930_040000_log_target_indexes from './20260930_040000_log_target_indexes'
import * as migration_20261001_000000_activity_lifecycle from './20261001_000000_activity_lifecycle'
import * as migration_20261001_010000_activity_completion_job from './20261001_010000_activity_completion_job'
import * as migration_20261002_000000_member_events from './20261002_000000_member_events'
import * as migration_20261002_000000_admin_panel_analytics from './20261002_000000_admin_panel_analytics'
import * as migration_20261002_000000_library_card_inactive_status from './20261002_000000_library_card_inactive_status'

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
  {
    up: migration_20260925_100000_phase_2_admin_screens.up,
    down: migration_20260925_100000_phase_2_admin_screens.down,
    name: '20260925_100000_phase_2_admin_screens',
  },
  {
    up: migration_20260928_000000_book_requests.up,
    down: migration_20260928_000000_book_requests.down,
    name: '20260928_000000_book_requests',
  },
  {
    up: migration_20260928_010000_payload_jobs.up,
    down: migration_20260928_010000_payload_jobs.down,
    name: '20260928_010000_payload_jobs',
  },
  {
    up: migration_20260928_020000_user_consent_required.up,
    down: migration_20260928_020000_user_consent_required.down,
    name: '20260928_020000_user_consent_required',
  },
  {
    up: migration_20260929_000000_review_aggregates.up,
    down: migration_20260929_000000_review_aggregates.down,
    name: '20260929_000000_review_aggregates',
  },
  {
    up: migration_20260929_000000_notification_coverage.up,
    down: migration_20260929_000000_notification_coverage.down,
    name: '20260929_000000_notification_coverage',
  },
  {
    up: migration_20260929_010000_notification_event_key.up,
    down: migration_20260929_010000_notification_event_key.down,
    name: '20260929_010000_notification_event_key',
  },
  {
    up: migration_20260930_000000_loan_pickup_window.up,
    down: migration_20260930_000000_loan_pickup_window.down,
    name: '20260930_000000_loan_pickup_window',
  },
  {
    up: migration_20260930_010000_pickup_window_enums.up,
    down: migration_20260930_010000_pickup_window_enums.down,
    name: '20260930_010000_pickup_window_enums',
  },
  {
    up: migration_20260930_020000_backfill_pickup_window.up,
    down: migration_20260930_020000_backfill_pickup_window.down,
    name: '20260930_020000_backfill_pickup_window',
  },
  {
    up: migration_20260930_030000_member_cancellation.up,
    down: migration_20260930_030000_member_cancellation.down,
    name: '20260930_030000_member_cancellation',
  },
  {
    up: migration_20260930_040000_log_target_indexes.up,
    down: migration_20260930_040000_log_target_indexes.down,
    name: '20260930_040000_log_target_indexes',
  },
  {
    up: migration_20261001_000000_activity_lifecycle.up,
    down: migration_20261001_000000_activity_lifecycle.down,
    name: '20261001_000000_activity_lifecycle',
  },
  {
    up: migration_20261001_010000_activity_completion_job.up,
    down: migration_20261001_010000_activity_completion_job.down,
    name: '20261001_010000_activity_completion_job',
  },
  {
    up: migration_20261002_000000_member_events.up,
    down: migration_20261002_000000_member_events.down,
    name: '20261002_000000_member_events',
  },
  {
    up: migration_20261002_000000_admin_panel_analytics.up,
    down: migration_20261002_000000_admin_panel_analytics.down,
    name: '20261002_000000_admin_panel_analytics',
  },
  {
    up: migration_20261002_000000_library_card_inactive_status.up,
    down: migration_20261002_000000_library_card_inactive_status.down,
    name: '20261002_000000_library_card_inactive_status',
  },
]
