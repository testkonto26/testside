<?php
/**
 * Plugin Name: Smukkekort Invitation Editor
 * Description: Reusable invitation editor foundation for Smukkekort and WooCommerce.
 * Version: 0.1.0
 * Requires PHP: 8.0
 * Text Domain: smukkekort-editor
 */
if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/includes/class-smukkekort-editor.php';
add_action('plugins_loaded', static function () { new Smukkekort_Editor(); });
