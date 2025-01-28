<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Mail\VerificationMail;
use Fleetbase\Traits\Expirable;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasSubject;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Twilio\Support\Laravel\Facade as Twilio;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class VerificationCode extends Model
{
    use HasUuid;
    use Expirable;
    use HasSubject;
    use HasMetaAttributes;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'verification_codes';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['subject_uuid', 'subject_type', 'code', 'for', 'expires_at', 'meta', 'status'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'expires_at' => 'datetime',
        'meta'       => Json::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = [];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /** on boot generate code */
    public static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->code = mt_rand(100000, 999999);
        });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\MorphTo
     */
    public function subject()
    {
        return $this->morphTo(__FUNCTION__, 'subject_type', 'subject_uuid');
    }

    /**
     * Generates a verification code object for the specified subject and context.
     * This method can optionally save the generated verification code to the database.
     *
     * @param mixed  $subject The subject for which the verification code is generated. Could be a User model or similar.
     * @param string $for     The context or purpose for generating the verification code. Default is 'general_verification'.
     * @param bool   $save    Determines whether to persist the generated verification code to the database. Default is true.
     *
     * @return static returns an instance of the verification code with optional subject and purpose set
     */
    public static function generateFor($subject = null, $for = 'general_verification', $save = true)
    {
        $verifyCode      = new static();
        $verifyCode->for = $for;

        if ($subject) {
            $verifyCode->setSubject($subject, false);
        }

        if ($save) {
            $verifyCode->save();
        }

        return $verifyCode;
    }

    /**
     * Generates and sends an email verification code for a specified subject. This method configures and sends an email
     * containing the verification code.
     *
     * @param mixed  $subject the subject (typically a User model) to whom the verification email will be sent
     * @param string $for     Context or purpose of the verification. Default is 'email_verification'.
     * @param array  $options Options to customize the verification process. Can include 'expireAfter' to set a custom expiration,
     *                        'meta' for additional metadata, 'subject' for the email subject, and 'content' for the email content.
     *
     * @return static returns the verification code instance after persisting it to the database and sending the email
     *
     * @throws \Exception throws an exception if the email cannot be sent
     */
    public static function generateEmailVerificationFor($subject, $for = 'email_verification', array $options = [])
    {
        $expireAfter                  = data_get($options, 'expireAfter');
        $verificationCode             = static::generateFor($subject, $for, false);
        $verificationCode->expires_at = $expireAfter === null ? Carbon::now()->addHour() : $expireAfter;
        $verificationCode->meta       = data_get($options, 'meta', []);
        $verificationCode->save();

        if (isset($subject->email)) {
            // See if subject option passed is callable
            $mailableSubject = data_get($options, 'subject');
            if (is_callable($mailableSubject)) {
                $options['subject'] = $mailableSubject($verificationCode);
            }

            // See if content passed
            $content = data_get($options, 'content');
            if (is_callable($content)) {
                $content = $content($verificationCode);
            }

            // Initialize the mailable definition
            $mail = new VerificationMail($verificationCode, $content);

            // Apply any additional Mail facade parameters
            $mailer = Mail::to($subject);
            foreach ($options as $key => $value) {
                if (method_exists($mailer, $key)) {
                    $mailer->$key($value);
                }
            }

            $mailer->send($mail);
        }

        return $verificationCode;
    }

    /**
     * Generates and sends an SMS verification code for a specified subject. This method handles the creation and dispatch
     * of an SMS containing the verification code.
     *
     * @param mixed  $subject the subject (typically a User model) to whom the SMS will be sent
     * @param string $for     Context or purpose of the verification. Default is 'phone_verification'.
     * @param array  $options Options to customize the verification process. Can include 'expireAfter' to set a custom expiration,
     *                        'meta' for additional metadata, and 'messageCallback' to customize the SMS message content.
     *
     * @return static returns the verification code instance after persisting it to the database and sending the SMS
     *
     * @throws \Exception throws an exception if the SMS cannot be sent
     */
    public static function generateSmsVerificationFor($subject, $for = 'phone_verification', array $options = [])
    {
        $expireAfter                  = data_get($options, 'expireAfter');
        $verificationCode             = static::generateFor($subject, $for, false);
        $verificationCode->expires_at = $expireAfter === null ? Carbon::now()->addHour() : $expireAfter;
        $verificationCode->meta       = data_get($options, 'meta', []);
        $verificationCode->save();

        // Get message
        $message         = 'Your ' . config('app.name') . ' verification code is ' . $verificationCode->code;
        $messageCallback = data_get($options, 'messageCallback');
        if (is_callable($messageCallback)) {
            $message = $messageCallback($verificationCode);
        }

        if ($subject->phone) {
            // Twilio::message($subject->phone, $message);
        }

        return $verificationCode;
    }
}
