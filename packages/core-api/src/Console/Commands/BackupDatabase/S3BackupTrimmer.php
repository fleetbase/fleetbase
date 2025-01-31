<?php

namespace Fleetbase\Console\Commands\BackupDatabase;

use Aws\S3\S3Client;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class S3BackupTrimmer
{
    public $days;
    public $bucket;
    public $when;

    private function __construct($days, $bucket)
    {
        $this->days   = $days;
        $this->bucket = $bucket;
        $this->when   = now()->subDays($this->days)->startOfDay();
    }

    public static function make($days, $bucket)
    {
        return new static($days, $bucket);
    }

    public function run()
    {
        $s3config = config('laravel-mysql-s3-backup.s3');
        $s3       = new S3Client($s3config);

        with($s3->listObjects(
            [
                'Bucket' => $this->bucket,
            ]
        ), function ($response) {
            return collect($response['Contents'] ?? [])
                ->when(
                    !empty(config('laravel-mysql-s3-backup.s3.folder')),
                    function ($contents) {
                        return collect($contents)->reject(
                            function ($item) {
                                return !Str::startsWith($item['Key'], config('laravel-mysql-s3-backup.s3.folder') . '/');
                            }
                        )->values();
                    }
                )
                ->transform(
                    function ($item) {
                        return $item['Key'];
                    }
                );
        })->filter(
            function ($filename) {
                if (!empty(config('laravel-mysql-s3-backup.s3.folder'))) {
                    $filename = str_replace(config('laravel-mysql-s3-backup.s3.folder') . '/', '', $filename);
                }

                // date is second to last part of filename
                $parts = explode('-', $filename);
                $index = count($parts) - 2;
                $date  = $parts[$index];

                return Carbon::createFromFormat('Ymd', $date)->lt($this->when);
            }
        )->tap(
            function ($filenames) use ($s3) {
                if ($filenames->isNotEmpty()) {
                    $s3->deleteObjects(
                        [
                            'Bucket' => $this->bucket,
                            'Delete' => [
                                'Objects' => $filenames->map(
                                    function ($filename) {
                                        return ['Key' => $filename];
                                    }
                                )->all(),
                            ],
                        ]
                    );
                }
            }
        );
    }
}
