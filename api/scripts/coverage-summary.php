<?php

declare(strict_types=1);

// Summarizes a Clover coverage report for the host API app (coverage over ./app)
// and optionally enforces a minimum line-coverage threshold.
//
// Usage:
//   php scripts/coverage-summary.php [path/to/clover.xml] [--fail-under=100]
//
// Ported from the Fleetbase extension packages' scripts/coverage-summary.php so
// the host app holds the same coverage bar and reporting format.

$cloverPath = 'coverage/clover.xml';
$failUnder  = null;

foreach (array_slice($argv, 1) as $arg) {
    if (str_starts_with($arg, '--fail-under=')) {
        $failUnder = (float) substr($arg, strlen('--fail-under='));

        continue;
    }

    if ($arg !== '') {
        $cloverPath = $arg;
    }
}

if (!is_file($cloverPath)) {
    fwrite(STDERR, "Coverage file not found: {$cloverPath}\n");
    fwrite(STDERR, "Run `composer test:coverage:clover` first.\n");
    exit(1);
}

$xml = simplexml_load_file($cloverPath);
if (!$xml) {
    fwrite(STDERR, "Unable to parse Clover coverage file: {$cloverPath}\n");
    exit(1);
}

function coveragePercent(int $covered, int $total): float
{
    return $total === 0 ? 0.0 : round(($covered / $total) * 100, 2);
}

function intMetric(SimpleXMLElement $node, string $name): int
{
    return (int) ($node->metrics[$name] ?? 0);
}

$project = $xml->project;
$metrics = $project->metrics;

$statements        = (int) ($metrics['statements'] ?? 0);
$coveredStatements = (int) ($metrics['coveredstatements'] ?? 0);
$methods           = (int) ($metrics['methods'] ?? 0);
$coveredMethods    = (int) ($metrics['coveredmethods'] ?? 0);
$classes           = (int) ($metrics['classes'] ?? 0);
$coveredClasses    = (int) ($metrics['coveredclasses'] ?? 0);

$files = [];

foreach ($project->xpath('.//file') ?: [] as $file) {
    $path             = (string) $file['name'];
    $fileStatements   = intMetric($file, 'statements');
    $coveredFileLines = intMetric($file, 'coveredstatements');

    if ($fileStatements === 0) {
        continue;
    }

    $files[] = [
        'path'       => $path,
        'covered'    => $coveredFileLines,
        'statements' => $fileStatements,
        'percent'    => coveragePercent($coveredFileLines, $fileStatements),
    ];
}

usort($files, function (array $a, array $b): int {
    return $a['percent'] <=> $b['percent']
        ?: $b['statements'] <=> $a['statements'];
});

printf("Line coverage: %.2f%% (%d/%d statements)\n", coveragePercent($coveredStatements, $statements), $coveredStatements, $statements);
printf("Method coverage: %.2f%% (%d/%d methods)\n", coveragePercent($coveredMethods, $methods), $coveredMethods, $methods);
printf("Class coverage: %.2f%% (%d/%d classes)\n", coveragePercent($coveredClasses, $classes), $coveredClasses, $classes);

echo "\nLowest covered files:\n";
foreach (array_slice($files, 0, 20) as $file) {
    $relativePath = preg_replace('#^' . preg_quote(getcwd(), '#') . '/?#', '', $file['path']);
    printf("  %6.2f%%  %5d/%-5d  %s\n", $file['percent'], $file['covered'], $file['statements'], $relativePath ?: $file['path']);
}

if ($failUnder !== null && coveragePercent($coveredStatements, $statements) < $failUnder) {
    fwrite(STDERR, sprintf("\nCoverage %.2f%% is below the required %.2f%% line threshold.\n", coveragePercent($coveredStatements, $statements), $failUnder));
    exit(1);
}
