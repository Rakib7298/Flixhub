<?php
/**
 * MediaMatrix WordPress presentation theme.
 * No MediaMatrix secrets or backend services are embedded in WordPress.
 */
if (!defined('ABSPATH')) { exit; }

function mediamatrix_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
}
add_action('after_setup_theme', 'mediamatrix_theme_setup');

function mediamatrix_assets() {
    $version = wp_get_theme()->get('Version');
    wp_enqueue_style('mediamatrix-style', get_stylesheet_uri(), array(), $version);
    wp_enqueue_script('mediamatrix-app', get_template_directory_uri() . '/assets/app.js', array(), $version, true);
    wp_localize_script('mediamatrix-app', 'mediaMatrixConfig', array(
        'restBase' => esc_url_raw(rest_url('mediamatrix/v1')),
        'appUrl' => esc_url_raw(get_option('mediamatrix_app_url', '')),
    ));
}
add_action('wp_enqueue_scripts', 'mediamatrix_assets');

function mediamatrix_sanitize_url($value) {
    $url = esc_url_raw(trim((string) $value));
    if ($url === '') { return ''; }
    $parts = wp_parse_url($url);
    if (!$parts || !isset($parts['scheme'], $parts['host']) || $parts['scheme'] !== 'https' || (isset($parts['user']) || isset($parts['pass']))) {
        add_settings_error('mediamatrix_api_base', 'invalid_url', __('Use an HTTPS URL without embedded credentials.', 'mediamatrix'));
        return get_option('mediamatrix_api_base', '');
    }
    return untrailingslashit($url);
}

function mediamatrix_settings_init() {
    register_setting('mediamatrix', 'mediamatrix_api_base', array('sanitize_callback' => 'mediamatrix_sanitize_url', 'default' => ''));
    register_setting('mediamatrix', 'mediamatrix_app_url', array('sanitize_callback' => 'mediamatrix_sanitize_url', 'default' => ''));
    add_settings_section('mediamatrix_main', __('MediaMatrix connection', 'mediamatrix'), function () {
        echo '<p>' . esc_html__('Connect this presentation theme to a separately deployed MediaMatrix application. API base normally ends in /api/public. Do not enter TMDB or administrator secrets.', 'mediamatrix') . '</p>';
    }, 'mediamatrix');
    add_settings_field('mediamatrix_api_base', __('Public API base URL', 'mediamatrix'), function () {
        printf('<input type="url" class="regular-text" name="mediamatrix_api_base" value="%s" placeholder="https://app.example.com/api/public" />', esc_attr(get_option('mediamatrix_api_base', '')));
    }, 'mediamatrix', 'mediamatrix_main');
    add_settings_field('mediamatrix_app_url', __('Primary application URL', 'mediamatrix'), function () {
        printf('<input type="url" class="regular-text" name="mediamatrix_app_url" value="%s" placeholder="https://app.example.com" />', esc_attr(get_option('mediamatrix_app_url', '')));
    }, 'mediamatrix', 'mediamatrix_main');
}
add_action('admin_init', 'mediamatrix_settings_init');

function mediamatrix_settings_page() {
    add_theme_page('MediaMatrix', 'MediaMatrix', 'manage_options', 'mediamatrix', function () {
        echo '<div class="wrap"><h1>MediaMatrix</h1><form method="post" action="options.php">';
        settings_fields('mediamatrix');
        do_settings_sections('mediamatrix');
        submit_button();
        echo '</form><p>This theme provides discovery only. Accounts, authorized playback, playlists, and FFmpeg are not implemented inside WordPress.</p></div>';
    });
}
add_action('admin_menu', 'mediamatrix_settings_page');

function mediamatrix_rate_limit() {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
    $key = 'mm_' . hash_hmac('sha256', $ip, wp_salt('nonce'));
    $count = (int) get_transient($key);
    if ($count >= 60) { return new WP_Error('rate_limited', __('Too many discovery requests. Try again shortly.', 'mediamatrix'), array('status' => 429)); }
    set_transient($key, $count + 1, MINUTE_IN_SECONDS);
    return true;
}

function mediamatrix_proxy($path, $query = array()) {
    $base = get_option('mediamatrix_api_base', '');
    if (!$base) { return new WP_Error('not_configured', __('Configure MediaMatrix in Appearance → MediaMatrix.', 'mediamatrix'), array('status' => 503)); }
    $url = add_query_arg($query, untrailingslashit($base) . $path);
    if (!wp_http_validate_url($url)) { return new WP_Error('unsafe_url', __('The configured API URL is not safe for server-side requests.', 'mediamatrix'), array('status' => 400)); }
    $response = wp_remote_get($url, array('timeout' => 10, 'redirection' => 0, 'limit_response_size' => 2097152, 'headers' => array('Accept' => 'application/json'), 'user-agent' => 'MediaMatrix-WordPress/1.0'));
    if (is_wp_error($response)) { return new WP_Error('upstream_error', __('The MediaMatrix application could not be reached.', 'mediamatrix'), array('status' => 502)); }
    $status = wp_remote_retrieve_response_code($response);
    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($data)) { return new WP_Error('invalid_response', __('The application returned an invalid response.', 'mediamatrix'), array('status' => 502)); }
    return rest_ensure_response(new WP_REST_Response($data, $status));
}

function mediamatrix_register_routes() {
    $permission = 'mediamatrix_rate_limit';
    register_rest_route('mediamatrix/v1', '/discover', array('methods' => 'GET', 'permission_callback' => $permission, 'callback' => function ($request) {
        return mediamatrix_proxy('/discover', array('type' => $request->get_param('type') === 'tv' ? 'tv' : 'movie', 'page' => min(500, max(1, absint($request->get_param('page'))))));
    }));
    register_rest_route('mediamatrix/v1', '/search', array('methods' => 'GET', 'permission_callback' => $permission, 'callback' => function ($request) {
        return mediamatrix_proxy('/search', array('q' => sanitize_text_field($request->get_param('q')), 'page' => min(100, max(1, absint($request->get_param('page'))))));
    }));
    register_rest_route('mediamatrix/v1', '/title', array('methods' => 'GET', 'permission_callback' => $permission, 'callback' => function ($request) {
        return mediamatrix_proxy('/title', array('type' => $request->get_param('type') === 'tv' ? 'tv' : 'movie', 'id' => absint($request->get_param('id')), 'country' => sanitize_text_field($request->get_param('country'))));
    }));
}
add_action('rest_api_init', 'mediamatrix_register_routes');
