<?php

$finder = PhpCsFixer\Finder::create()->in(['src', 'tests']);

return PhpCsFixer\Config::create()
    ->setRules([
        '@Symfony' => true,
        '@PhpCsFixer' => true,
        'ereg_to_preg' => true,
        'no_php4_constructor' => true,
        'strict_comparison' => true,
        'strict_param' => true,
        'php_unit_internal_class' => false,
        'php_unit_test_class_requires_covers' => false,
        'no_superfluous_phpdoc_tags' => false,
        'function_declaration' => [
            'closure_function_spacing' => 'none',
        ],
        'phpdoc_align' => [
            'align' => 'left',
        ],
        'multiline_whitespace_before_semicolons' => [
            'strategy' => 'no_multi_line',
        ],
    ])
    ->setFinder($finder);
