<?php if (!defined('ABSPATH')) { exit; } ?><!doctype html>
<html <?php language_attributes(); ?>>
<head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#080a0d"><?php wp_head(); ?></head>
<body <?php body_class('mm-theme'); ?>><?php wp_body_open(); ?><a class="mm-skip" href="#mm-content"><?php esc_html_e('Skip to content', 'mediamatrix'); ?></a>
<header class="mm-header"><a class="mm-brand" href="<?php echo esc_url(home_url('/')); ?>">Media<span>Matrix</span></a><?php $app_url = get_option('mediamatrix_app_url', ''); if ($app_url) : ?><a class="mm-app-link" href="<?php echo esc_url($app_url); ?>"><?php esc_html_e('Open primary application', 'mediamatrix'); ?> →</a><?php endif; ?></header>
