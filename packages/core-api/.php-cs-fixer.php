<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__ . DIRECTORY_SEPARATOR . 'tests')
    ->in(__DIR__ . DIRECTORY_SEPARATOR . 'seeders')
    ->in(__DIR__ . DIRECTORY_SEPARATOR . 'migrations')
    ->in(__DIR__ . DIRECTORY_SEPARATOR . 'src')
    ->append(['.php-cs-fixer.php']);

$rules = [
    '@Symfony'               => true,
    'phpdoc_no_empty_return' => false,
    'phpdoc_to_comment'      => false,
    'array_syntax'           => ['syntax' => 'short'],
    'yoda_style'             => false,
    'binary_operator_spaces' => [
        'operators' => [
            '=>' => 'align',
            '='  => 'align',
        ],
    ],
    'concat_space'            => ['spacing' => 'one'],
    'not_operator_with_space' => false,
    'increment_style'         => ['style' => 'post'],
    'indentation_type'        => true,
    'single_quote'            => true,
];

return (new PhpCsFixer\Config())
    ->setUsingCache(true)
    ->setRules($rules)
    ->setFinder($finder);
