<?php

namespace App\Console\Commands\Concerns;

use Illuminate\Contracts\Process\ProcessResult;
use Illuminate\Support\Facades\Process;

/**
 * Runs Composer in one of the API's two projects (api/ or api/extensions/), echoing the command and
 * streaming its output to the console.
 */
trait RunsComposer
{
    /**
     * @param array<int, string> $command
     */
    protected function runComposer(string $cwd, array $command): ProcessResult
    {
        $this->line('<comment>$ ' . implode(' ', $command) . '</comment>  (in ' . $cwd . ')');

        return Process::path($cwd)->forever()->run($command, $this->relayOutput(...));
    }

    /**
     * Process output callback: Composer writes progress to stderr, so both streams are shown.
     */
    public function relayOutput(string $type, string $output): void
    {
        $this->output->write($output);
    }
}
