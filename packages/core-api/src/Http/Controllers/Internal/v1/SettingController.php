<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Requests\AdminRequest;
use Fleetbase\Models\File;
use Fleetbase\Models\Setting;
use Fleetbase\Notifications\TestPushNotification;
use Fleetbase\Support\Utils;
use Illuminate\Http\Request;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SettingController extends Controller
{
    /**
     * Simple admin overview metrics -- v1.
     *
     * @return void
     */
    public function adminOverview(AdminRequest $request)
    {
        $metrics                        = [];
        $metrics['total_users']         = \Fleetbase\Models\User::all()->count();
        $metrics['total_organizations'] = \Fleetbase\Models\Company::all()->count();
        $metrics['total_transactions']  = \Fleetbase\Models\Transaction::all()->count();

        return response()->json($metrics);
    }

    /**
     * Retrieves the current filesystem configuration including details about configured storage drivers.
     * It specifically fetches configurations for AWS S3 and Google Cloud Storage (GCS).
     *
     * @param AdminRequest $request the incoming request
     *
     * @return \Illuminate\Http\JsonResponse JSON response containing the filesystem configuration details
     */
    public function getFilesystemConfig(AdminRequest $request)
    {
        $driver = config('filesystems.default');
        $disks  = array_keys(config('filesystems.disks', []));

        // additional configurables
        $s3Bucket   = config('filesystems.disks.s3.bucket');
        $s3Url      = config('filesystems.disks.s3.url');
        $s3Endpoint = config('filesystems.disks.s3.endpoint');

        // Get GCS bucket
        $gcsBucket   = config('filesystems.disks.gcs.bucket');

        // Get GCS configurations
        $isGoogleCloudStorageEnvConfigued = (!empty(env('GOOGLE_CLOUD_STORAGE_BUCKET')) && !empty(env('GOOGLE_CLOUD_PROJECT_ID'))) || !empty(env('GOOGLE_APPLICATION_CREDENTIALS')) || !empty(env('GOOGLE_CLOUD_KEY_FILE'));

        // Get the GCS configuration file if any
        $gcsCredentialsFileId = config('filesystems.disks.gcs.key_file_id');
        $gcsCredentialsFile   = null;
        if (Str::isUuid($gcsCredentialsFileId)) {
            $gcsCredentialsFile = File::where('uuid', $gcsCredentialsFileId)->first();
        }

        return response()->json([
            'driver'                           => $driver,
            'disks'                            => $disks,
            's3Bucket'                         => $s3Bucket,
            's3Url'                            => $s3Url,
            's3Endpoint'                       => $s3Endpoint,
            'gcsBucket'                        => $gcsBucket,
            'isGoogleCloudStorageEnvConfigued' => $isGoogleCloudStorageEnvConfigued,
            'gcsCredentialsFileId'             => $gcsCredentialsFileId,
            'gcsCredentialsFile'               => $gcsCredentialsFile,
        ]);
    }

    /**
     * Saves the updated filesystem configuration based on the incoming request.
     * It handles the settings for various filesystem drivers like local, AWS S3, and GCS.
     *
     * @param AdminRequest $request the incoming request containing filesystem configuration data
     *
     * @return \Illuminate\Http\JsonResponse JSON response indicating the success status of the operation
     */
    public function saveFilesystemConfig(AdminRequest $request)
    {
        $driver = $request->input('driver', 'local');
        $s3     = $request->input('s3', config('filesystems.disks.s3'));
        $gcs    = static::_getGcsConfigWithIcomingRequest($request);

        Setting::configureSystem('filesystem.driver', $driver);
        Setting::configureSystem('filesystem.gcs', $gcs);
        Setting::configureSystem('filesystem.s3', array_merge(config('filesystems.disks.s3', []), $s3));

        return response()->json(['status' => 'OK']);
    }

    /**
     * Extracts the Google Cloud Storage (GCS) configuration from the incoming request.
     * Updates the GCS configuration based on the provided bucket information and credentials file ID.
     *
     * @param Request $request the incoming request with GCS configuration details
     *
     * @return array the updated GCS configuration array
     */
    private static function _getGcsConfigWithIcomingRequest(Request $request): array
    {
        $gcsBucket                  = $request->input('gcsBucket');
        $gcsCredentialsFileId       = $request->input('gcsCredentialsFileId');
        $gcsConfig                  = config('filesystems.disks.gcs');
        $gcsConfig['bucket']        = $gcsBucket;
        if ($gcsCredentialsFileId) {
            $gcsCredentialsContent = static::_setupGcsConfigUsingFileId($gcsCredentialsFileId);
            if (is_array($gcsCredentialsContent)) {
                $gcsConfig['key_file']    = $gcsCredentialsContent;
                $gcsConfig['key_file_id'] = $gcsCredentialsFileId;
                if (isset($gcsCredentialsContent['project_id'])) {
                    $gcsConfig['project_id'] = $gcsCredentialsContent['project_id'];
                }
            }
        } else {
            unset($gcsConfig['key_file_id']);
            $gcsConfig['key_file'] = [];
        }

        return $gcsConfig;
    }

    /**
     * Sets up the Google Cloud Storage (GCS) configuration using a given file ID.
     * Retrieves the credentials file for GCS and decodes its contents to use in the GCS configuration.
     *
     * @param string $fileId the UUID of the file containing GCS credentials
     *
     * @return array an array containing the parsed content of the GCS credentials file
     */
    private static function _setupGcsConfigUsingFileId(string $fileId): array
    {
        if (!Str::isUuid($fileId)) {
            return [];
        }

        // Get the "GOOGLE_APPLICATION_CREDENTIALS" file
        $gcsCredentialsFile = File::where('uuid', $fileId)->first();
        if ($gcsCredentialsFile) {
            $gcsCredentialsFileContents = Storage::disk($gcsCredentialsFile->disk)->get($gcsCredentialsFile->path);
            if (is_string($gcsCredentialsFileContents)) {
                $gcsCredentialsFileContents = json_decode($gcsCredentialsFileContents, true);

                return $gcsCredentialsFileContents;
            }
        }

        return [];
    }

    /**
     * Creates a file and uploads it to the users default disks.
     *
     * @param Request $request the incoming HTTP request containing the authenticated user
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response with a success message and HTTP status 200
     */
    public function testFilesystemConfig(AdminRequest $request)
    {
        $disk     = $request->input('disk', config('filesystems.default'));
        $message  = 'Filesystem configuration is successful, test file uploaded.';
        $status   = 'success';
        $uploaded = false;

        // set config values from input
        config(['filesystems.default' => $disk]);
        try {
            Storage::disk($disk)->put('testfile.txt', 'Hello World');
        } catch (\Aws\S3\Exception\S3Exception $e) {
            $message = $e->getMessage();
            $status  = 'error';
        } catch (\Throwable $e) {
            $message = $e->getMessage();
            $status  = 'error';
        }

        // confirm file uploaded
        try {
            $uploaded = Storage::disk($disk)->exists('testfile.txt');
        } catch (\Throwable $e) {
            $message = $e->getMessage();
            $status  = 'error';
        }

        // sometimes there is no error but file is not uploaded
        if (!$uploaded) {
            $status  = 'error';
            $message = 'Configuration is working, but test file upload failed for uknown reasons.';
        }

        return response()->json(['status' => $status, 'message' => $message, 'uploaded' => $uploaded]);
    }

    /**
     * Loads and sends the mail configuration.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getMailConfig(AdminRequest $request)
    {
        $mailer         = config('mail.default');
        $from           = config('mail.from');
        $mailers        = Arr::except(array_keys(config('mail.mailers', [])), ['log', 'array', 'failover']);
        $smtpConfig     = config('mail.mailers.smtp');
        $mailgunConfig  = config('services.mailgun');
        $postmarkConfig = config('services.postmark');
        $sendgridConfig = config('services.sendgrid');
        $resendConfig   = config('services.resend');

        $config = [
            'mailer'      => $mailer,
            'mailers'     => $mailers,
            'fromAddress' => data_get($from, 'address'),
            'fromName'    => data_get($from, 'name'),
        ];

        foreach ($smtpConfig as $key => $value) {
            if ($key === 'transport') {
                continue;
            }

            $config['smtp' . ucfirst($key)] = $value;
        }

        foreach ($mailgunConfig as $key => $value) {
            $config['mailgun' . ucfirst($key)] = $value;
        }

        foreach ($postmarkConfig as $key => $value) {
            $config['postmark' . ucfirst($key)] = $value;
        }

        foreach ($sendgridConfig as $key => $value) {
            $config['sendgrid' . ucfirst($key)] = $value;
        }

        foreach ($resendConfig as $key => $value) {
            $config['resend' . ucfirst($key)] = $value;
        }

        return response()->json($config);
    }

    /**
     * Saves mail configuration.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveMailConfig(AdminRequest $request)
    {
        $mailer     = $request->input('mailer', 'smtp');
        $from       = $request->array('from', []);
        $smtp       = $request->array('smtp');
        $mailgun    = $request->array('mailgun');
        $postmark   = $request->array('postmark');
        $sendgrid   = $request->array('sendgrid');
        $resend     = $request->array('resend');

        Setting::configureSystem('mail.mailer', $mailer);
        Setting::configureSystem('mail.from', $from);
        Setting::configureSystem('mail.smtp', array_merge(['transport' => 'smtp'], $smtp));
        Setting::configureSystem('services.mailgun', $mailgun);
        Setting::configureSystem('services.postmark', $postmark);
        Setting::configureSystem('services.sendgrid', $sendgrid);
        Setting::configureSystem('services.resend', $resend);

        return response()->json(['status' => 'OK']);
    }

    /**
     * Sends a test email to the authenticated user.
     *
     * This function retrieves the authenticated user from the given request and sends a
     * test email to the user's email address. It returns a JSON response indicating whether
     * the email was sent successfully.
     *
     * @param Request $request the incoming HTTP request containing the authenticated user
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response with a success message and HTTP status 200
     */
    public function testMailConfig(AdminRequest $request)
    {
        $mailer = $request->input('mailer', 'smtp');
        $from   = $request->input(
            'from',
            [
                'address' => Utils::getDefaultMailFromAddress(),
                'name'    => 'Fleetbase',
            ]
        );
        $smtp       = $request->input('smtp', []);
        $mailgun    = $request->array('mailgun');
        $postmark   = $request->array('postmark');
        $sendgrid   = $request->array('sendgrid');
        $resend     = $request->array('resend');
        $user       = $request->user();
        $message    = 'Mail configuration is successful, check your inbox for the test email to confirm.';
        $status     = 'success';

        // set config values from input
        config(['mail.default' => $mailer, 'mail.from' => $from, 'mail.mailers.smtp' => array_merge(['transport' => 'smtp'], $smtp)]);

        // set mailer configs
        if ($mailer === 'mailgun') {
            config(['services.mailgun' => $mailgun]);
        }

        if ($mailer === 'postmark') {
            config(['services.postmark' => $postmark]);
        }

        if ($mailer === 'sendgrid') {
            config(['services.sendgrid' => $sendgrid]);
        }

        if ($mailer === 'resend') {
            config(['services.resend' => $resend]);
        }

        try {
            Mail::send(new \Fleetbase\Mail\TestMail($user, $mailer));
        } catch (\Aws\Ses\Exception\SesException|\Exception $e) {
            $message = $e->getMessage();
            $status  = 'error';
        }

        return response()->json(['status' => $status, 'message' => $message]);
    }

    /**
     * Loads and sends the queue configuration.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getQueueConfig(AdminRequest $request)
    {
        $driver      = config('queue.default');
        $connections = array_keys(config('queue.connections', []));

        // additional configurables
        $beanstalkdHost  = config('queue.connections.beanstalkd.host');
        $beanstalkdQueue = config('queue.connections.beanstalkd.queue');
        $sqsPrefix       = config('queue.connections.sqs.prefix');
        $sqsQueue        = config('queue.connections.sqs.queue');
        $sqsSuffix       = config('queue.connections.sqs.suffix');

        return response()->json([
            'driver'          => $driver,
            'connections'     => $connections,
            'beanstalkdHost'  => $beanstalkdHost,
            'beanstalkdQueue' => $beanstalkdQueue,
            'sqsPrefix'       => $sqsPrefix,
            'sqsQueue'        => $sqsQueue,
            'sqsSuffix'       => $sqsSuffix,
        ]);
    }

    /**
     * Saves queue configuration.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveQueueConfig(AdminRequest $request)
    {
        $driver     = $request->input('driver', 'sync');
        $sqs        = $request->input('sqs', config('queue.connections.sqs'));
        $beanstalkd = $request->input('beanstalkd', config('queue.connections.beanstalkd'));

        Setting::configureSystem('queue.driver', $driver);
        Setting::configureSystem('queue.sqs', array_merge(config('queue.connections.sqs'), $sqs));
        Setting::configureSystem('queue.beanstalkd', array_merge(config('queue.connections.beanstalkd'), $beanstalkd));

        return response()->json(['status' => 'OK']);
    }

    /**
     * Sends a test message to the queue .
     *
     * @param Request $request the incoming HTTP request containing the authenticated user
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response with a success message and HTTP status 200
     */
    public function testQueueConfig(AdminRequest $request)
    {
        $queue   = $request->input('queue', config('queue.connections.sqs.queue'));
        $message = 'Queue configuration is successful, message sent to queue.';
        $status  = 'success';

        // set config values from input
        config(['queue.default' => $queue]);

        try {
            Queue::pushRaw(json_encode(['message' => 'Hello World']));
        } catch (\Aws\Sqs\Exception\SqsException $e) {
            $message = $e->getMessage();
            $status  = 'error';
        } catch (\Throwable $e) {
            $message = $e->getMessage();
            $status  = 'error';
        }

        return response()->json(['status' => $status, 'message' => $message]);
    }

    /**
     * Loads and sends the services configuration.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getServicesConfig(AdminRequest $request)
    {
        /** aws service */
        $awsKey    = config('services.aws.key', env('AWS_ACCESS_KEY_ID'));
        $awsSecret = config('services.aws.secret', env('AWS_SECRET_ACCESS_KEY'));
        $awsRegion = config('services.aws.region', env('AWS_DEFAULT_REGION', 'us-east-1'));

        /** ipinfo service */
        $ipinfoApiKey = config('services.ipinfo.api_key', env('IPINFO_API_KEY'));

        /** google maps service */
        $googleMapsApiKey = config('services.google_maps.api_key', env('GOOGLE_MAPS_API_KEY'));
        $googleMapsLocale = config('services.google_maps.locale', env('GOOGLE_MAPS_LOCALE', 'us'));

        /** twilio service */
        $twilioSid   = config('services.twilio.sid', env('TWILIO_SID'));
        $twilioToken = config('services.twilio.token', env('TWILIO_TOKEN'));
        $twilioFrom  = config('services.twilio.from', env('TWILIO_FROM'));

        /** sentry service */
        $sentryDsn = config('sentry.dsn', env('SENTRY_LARAVEL_DSN', env('SENTRY_DSN')));

        return response()->json([
            'awsKey'           => $awsKey,
            'awsSecret'        => $awsSecret,
            'awsRegion'        => $awsRegion,
            'ipinfoApiKey'     => $ipinfoApiKey,
            'googleMapsApiKey' => $googleMapsApiKey,
            'googleMapsLocale' => $googleMapsLocale,
            'twilioSid'        => $twilioSid,
            'twilioToken'      => $twilioToken,
            'twilioFrom'       => $twilioFrom,
            'sentryDsn'        => $sentryDsn,
        ]);
    }

    /**
     * Saves services configuration.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveServicesConfig(AdminRequest $request)
    {
        $aws        = $request->input('aws', config('services.aws'));
        $ipinfo     = $request->input('ipinfo', config('services.ipinfo'));
        $googleMaps = $request->input('googleMaps', config('services.google_maps'));
        $twilio     = $request->input('twilio', config('services.twilio'));
        $sentry     = $request->input('sentry', config('sentry.dsn'));

        Setting::configureSystem('services.aws', array_merge(config('services.aws', []), $aws));
        Setting::configureSystem('services.ipinfo', array_merge(config('services.ipinfo', []), $ipinfo));
        Setting::configureSystem('services.google_maps', array_merge(config('services.google_maps', []), $googleMaps));
        Setting::configureSystem('services.twilio', array_merge(config('services.twilio', []), $twilio));
        Setting::configureSystem('services.sentry', array_merge(config('sentry', []), $sentry));

        return response()->json(['status' => 'OK']);
    }

    /**
     * Loads and sends the notification channel configurations.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getNotificationChannelsConfig(AdminRequest $request)
    {
        // get apn config
        $apn = config('broadcasting.connections.apn');

        if (is_array($apn) && isset($apn['private_key_file_id'])) {
            $apn['private_key_file'] = File::where('uuid', $apn['private_key_file_id'])->first();
        }

        // get firebase config
        $firebase = config('firebase.projects.app');

        if (is_array($firebase) && isset($firebase['credentials_file_id'])) {
            $firebase['credentials_file'] = File::where('uuid', $firebase['credentials_file_id'])->first();
        }

        return response()->json([
            'apn'      => $apn,
            'firebase' => $firebase,
        ]);
    }

    /**
     * Saves notification channels configuration.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveNotificationChannelsConfig(AdminRequest $request)
    {
        $apn         = $request->array('apn', config('broadcasting.connections.apn'));
        $firebase    = $request->array('firebase', config('firebase.projects.app'));

        // Get the APN key file and it's contents and store to config
        $apn = static::_setupApnConfigUsingFileId($apn);

        // Get credentials config array from file contents
        $firebase = static::_setupFcmConfigUsingFileId($firebase);

        Setting::configureSystem('broadcasting.apn', array_merge(config('broadcasting.connections.apn', []), $apn));
        Setting::configureSystem('firebase.app', array_merge(config('firebase.projects.app', []), $firebase));

        return response()->json(['status' => 'OK']);
    }

    /**
     * Test notification channels configuration.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function testNotificationChannelsConfig(AdminRequest $request)
    {
        $title         = $request->input('title', 'Hello World from Fleetbase 🚀');
        $message       = $request->input('message', 'This is a test push notification!');
        $apnToken      = $request->input('apnToken');
        $fcmToken      = $request->input('fcmToken');
        $apn           = $request->array('apn', config('broadcasting.connections.apn'));
        $firebase      = $request->array('firebase', config('firebase.projects.app'));

        // Get the APN key file and it's contents and store to config
        $apn = static::_setupApnConfigUsingFileId($apn);

        // Get credentials config array from file contents
        $firebase = static::_setupFcmConfigUsingFileId($firebase);

        // temporarily set apn config here
        config(['broadcasting.connections.apn' => $apn]);

        // temporarily set apn config here
        config(['firebase.projects.app' => $firebase]);

        // trigger test notification
        $notifiable = (new AnonymousNotifiable());

        if ($apnToken) {
            $notifiable->route('apn', $apnToken);
        }

        if ($fcmToken) {
            $notifiable->route('fcm', $fcmToken);
        }

        $status          = 'success';
        $responseMessage = 'Notification sent successfully.';

        try {
            $notifiable->notify(new TestPushNotification($title, $message));
        } catch (\Throwable $e) {
            $responseMessage = $e->getMessage();
            $status          = 'error';
        }

        return response()->json(['status' => $status, 'message' => $responseMessage]);
    }

    /**
     * Sets up the Apple Push Notification (APN) configuration using a specified file ID.
     *
     * This function retrieves the APN key file based on the provided file ID, extracts its contents,
     * and stores them in the configuration array. The function expects an array with at least the
     * 'private_key_file_id' element, which should be a valid UUID. The function modifies the
     * input array by setting the 'private_key_content' and unsetting 'private_key_path' and
     * 'private_key_file'.
     *
     * @param array $apn an associative array containing the APN configuration,
     *                   specifically the 'private_key_file_id'
     *
     * @return array the modified APN configuration array with 'private_key_content' set
     *
     * @throws Exception if file retrieval or processing fails
     */
    private static function _setupApnConfigUsingFileId(array $apn = []): array
    {
        // Get the APN key file and it's contents and store to config
        if (is_array($apn) && isset($apn['private_key_file_id']) && Str::isUuid($apn['private_key_file_id'])) {
            $apnKeyFile = File::where('uuid', $apn['private_key_file_id'])->first();
            if ($apnKeyFile) {
                $apnKeyFileContents = Storage::disk($apnKeyFile->disk)->get($apnKeyFile->path);
                if ($apnKeyFileContents) {
                    $apn['private_key_content'] = str_replace('\\n', "\n", trim($apnKeyFileContents));
                }
            }
        }

        // Always set apn `private_key_path` and `private_key_file`
        unset($apn['private_key_path'], $apn['private_key_file']);

        return $apn;
    }

    /**
     * Sets up Firebase Cloud Messaging (FCM) configuration using a specified file ID.
     *
     * This function retrieves the FCM credentials file based on the provided file ID, extracts
     * its contents, and decodes it into an array. It expects an array with at least the
     * 'credentials_file_id' element, which should be a valid UUID. The function modifies the
     * input array by setting the 'credentials' element with the extracted and processed credentials
     * content and unsetting 'credentials_file'.
     *
     * @param array $firebase an associative array containing the Firebase configuration,
     *                        specifically the 'credentials_file_id'
     *
     * @return array the modified Firebase configuration array with 'credentials' set
     *
     * @throws Exception if file retrieval or processing fails
     */
    private static function _setupFcmConfigUsingFileId(array $firebase = []): array
    {
        if (is_array($firebase) && isset($firebase['credentials_file_id']) && Str::isUuid($firebase['credentials_file_id'])) {
            $firebaseCredentialsFile = File::where('uuid', $firebase['credentials_file_id'])->first();
            if ($firebaseCredentialsFile) {
                $firebaseCredentialsContent = Storage::disk($firebaseCredentialsFile->disk)->get($firebaseCredentialsFile->path);
                if ($firebaseCredentialsContent) {
                    $firebaseCredentialsContentArray = json_decode($firebaseCredentialsContent, true);
                    if (is_array($firebaseCredentialsContentArray)) {
                        $firebaseCredentialsContentArray['private_key'] =  str_replace('\\n', "\n", trim($firebaseCredentialsContentArray['private_key']));
                    }
                    $firebase['credentials'] = $firebaseCredentialsContentArray;
                }
            }
        }

        // Always set apn `credentials_file`
        unset($firebase['credentials_file']);

        return $firebase;
    }

    /**
     * Get branding settings.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getBrandingSettings()
    {
        $brandingSettings = Setting::getBranding();

        return response()->json(['brand' => $brandingSettings]);
    }

    /**
     * Saves branding settings.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveBrandingSettings(AdminRequest $request)
    {
        $iconUuid     = $request->input('brand.icon_uuid');
        $logoUuid     = $request->input('brand.logo_uuid');
        $defaultTheme = $request->input('brand.default_theme');

        if ($defaultTheme) {
            Setting::configure('branding.default_theme', $defaultTheme);
        }

        if ($iconUuid) {
            Setting::configure('branding.icon_uuid', $iconUuid);
        } else {
            Setting::configure('branding.icon_uuid', null);
        }

        if ($logoUuid) {
            Setting::configure('branding.logo_uuid', $logoUuid);
        } else {
            Setting::configure('branding.logo_uuid', null);
        }

        $brandingSettings = Setting::getBranding();

        return response()->json(['brand' => $brandingSettings]);
    }

    /**
     * Sends a test SMS message using Twilio.
     *
     * @param Request $request the incoming HTTP request containing the authenticated user
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response with a success message and HTTP status 200
     */
    public function testTwilioConfig(AdminRequest $request)
    {
        $sid   = $request->input('sid');
        $token = $request->input('token');
        $from  = $request->input('from');
        $phone = $request->input('phone');

        if (!$phone) {
            return response()->json(['status' => 'error', 'message' => 'No test phone number provided!']);
        }

        // Set config from request
        config(['twilio.twilio.connections.twilio.sid' => $sid, 'twilio.twilio.connections.twilio.token' => $token, 'twilio.twilio.connections.twilio.from' => $from]);

        $message = 'Twilio configuration is successful, SMS sent to ' . $phone . '.';
        $status  = 'success';

        try {
            \Fleetbase\Twilio\Support\Laravel\Facade::message($phone, 'This is a Twilio test from Fleetbase');
        } catch (\Twilio\Exceptions\RestException $e) {
            $message = $e->getMessage();
            $status  = 'error';
        } catch (\Exception $e) {
            $message = $e->getMessage();
            $status  = 'error';
        } catch (\Error $e) {
            $message = $e->getMessage();
            $status  = 'error';
        } catch (\ErrorException $e) {
            $message = $e->getMessage();
            $status  = 'error';
        }

        return response()->json(['status' => $status, 'message' => $message]);
    }

    /**
     * Sends a test exception to Sentry.
     *
     * @param Request $request the incoming HTTP request containing the authenticated user
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response with a success message and HTTP status 200
     */
    public function testSentryConfig(AdminRequest $request)
    {
        $dsn = $request->input('dsn');

        // Set config from request
        config(['sentry.dsn' => $dsn]);

        $message = 'Sentry configuration is successful, test Exception sent.';
        $status  = 'success';

        try {
            $clientBuilder = \Sentry\ClientBuilder::create([
                'dsn'                => $dsn,
                'release'            => env('SENTRY_RELEASE'),
                'environment'        => app()->environment(),
                'traces_sample_rate' => 1.0,
            ]);
        } catch (\Exception $e) {
            $message = $e->getMessage();
            $status  = 'error';
        }

        if ($clientBuilder) {
            // Set the Laravel SDK identifier and version
            $clientBuilder->setSdkIdentifier(\Sentry\Laravel\Version::SDK_IDENTIFIER);
            $clientBuilder->setSdkVersion(\Sentry\Laravel\Version::SDK_VERSION);

            // Create hub
            $hub = new \Sentry\State\Hub($clientBuilder->getClient());

            // Create test exception
            $testException = null;

            try {
                throw new \Exception('This is a test exception sent from the Sentry Laravel SDK.');
            } catch (\Exception $exception) {
                $testException = $exception;
            }

            try {
                // Capture test exception
                $hub->captureException($testException);
            } catch (\Exception $e) {
                $message = $e->getMessage();
                $status  = 'error';
            }
        }

        return response()->json(['status' => $status, 'message' => $message]);
    }

    /**
     * Test SocketCluster Configuration.
     *
     * @param Request $request the incoming HTTP request containing the authenticated user
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response with a success message and HTTP status 200
     */
    public function testSocketcluster(AdminRequest $request)
    {
        // Get the channel to publish to
        $channel  = $request->input('channel', 'test');
        $message  = 'Socket broadcasted message successfully.';
        $status   = 'success';
        $sent     = false;
        $response = null;

        $socketClusterClient = new \Fleetbase\Support\SocketCluster\SocketClusterService();

        try {
            $sent = $socketClusterClient->send($channel, [
                'message' => 'Hello World',
                'sender'  => 'Fleetbase',
            ]);
            $response = $socketClusterClient->response();
        } catch (\WebSocket\ConnectionException $e) {
            $message = $e->getMessage();
        } catch (\WebSocket\TimeoutException $e) {
            $message = $e->getMessage();
        } catch (\Throwable $e) {
            $message = $e->getMessage();
        }

        if (!$sent) {
            $status = 'error';
        }

        return response()->json(
            [
                'status'   => $status,
                'message'  => $message,
                'channel'  => $channel,
                'response' => $response,
            ]
        );
    }
}
