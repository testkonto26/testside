<?php
if (!defined('ABSPATH')) { exit; }
final class Smukkekort_Editor {
    public function __construct() {
        add_action('init', [$this, 'register_template_post_type']);
        add_shortcode('smukkekort_editor', [$this, 'render_editor']);
    }
    public function register_template_post_type(): void {
        register_post_type('smuk_template', [
            'labels' => ['name' => __('Invitation templates', 'smukkekort-editor'), 'singular_name' => __('Invitation template', 'smukkekort-editor')],
            'public' => false, 'show_ui' => true, 'show_in_rest' => true, 'supports' => ['title', 'thumbnail', 'custom-fields'],
            'menu_icon' => 'dashicons-format-image'
        ]);
        register_taxonomy('smuk_occasion', ['smuk_template'], [
            'label' => __('Anledning', 'smukkekort-editor'), 'hierarchical' => true, 'show_ui' => true, 'show_in_rest' => true
        ]);
    }
    public function render_editor(): string {
        return '<div class="smukkekort-editor" data-renderer="smukkekort"><p>' . esc_html__('Editor assets are loaded by the theme integration.', 'smukkekort-editor') . '</p></div>';
    }
}
