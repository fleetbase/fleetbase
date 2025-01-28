<?php

use Aws\Credentials\CredentialProvider;

$provider = CredentialProvider::defaultProvider();

$s3Config = [
    'version' => 'latest',
    'bucket' => env('DB_BACKUP_BUCKET', 'fleetbase-db-backups'),
    'region' => env('AWS_DEFAULT_REGION', 'ap-southeast-1'),
    'endpoint' => env('AWS_ENDPOINT')
];

if (env('APP_ENV') === 'local' || env('APP_ENV') === 'development') {
    $s3Config['key'] = env('AWS_ACCESS_KEY_ID');
    $s3Config['secret'] = env('AWS_SECRET_ACCESS_KEY');
} else {
    $s3Config['credentials'] = $provider;
}

return [
    /*
     * Configure with your Amazon S3 credentials
     * You should use an IAM user who only has PutObject access
     * to a specified bucket
     */
    's3' => $s3Config,

    /*
     * Want to add some custom mysqldump args?
     */
    'custom_mysqldump_args' => '--default-character-set=utf8mb4',

    /*
     * Whether or not to gzip the .sql file
     */
    'gzip' => true,

    /*
     * Time allowed to run backup
     */
    'sql_timout' => 7200, // 2 hours

    /*
     * Backup filename
     */
    'filename' => str_replace([' ', '-'], '_', env('APP_ENV', 'local')) . '_%s_backup-%s.sql',

    /*
     * Where to store the backup file locally
     */
    'backup_dir' => '/tmp',

    /*
     * Do you want to keep a copy of it or delete it
     * after it's been uploaded?
     */
    'keep_local_copy' => false,

    /*
     * Do you want to keep a rolling number of
     * backups on S3? How many days worth?
     */
    'rolling_backup_days' => 30,
];
