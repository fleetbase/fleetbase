<?php

return [

    /*
    |--------------------------------------------------------------------------
    | خطوط زبان اعتبارسنجی
    |--------------------------------------------------------------------------
    |
    | خطوط زبان زیر شامل پیام‌های خطای پیش‌فرض استفاده‌شده توسط کلاس اعتبارسنجی هستند.
    | برخی از این قوانین نسخه‌های متعددی دارند، مانند قوانین مربوط به اندازه.
    | شما می‌توانید این پیام‌ها را در اینجا به دلخواه تنظیم کنید.
    |
    */

    'accepted' => 'فیلد :attribute باید پذیرفته شود.',
    'accepted_if' => 'فیلد :attribute باید پذیرفته شود وقتی :other برابر با :value باشد.',
    'active_url' => 'فیلد :attribute یک URL معتبر نیست.',
    'after' => 'فیلد :attribute باید تاریخی پس از :date باشد.',
    'after_or_equal' => 'فیلد :attribute باید تاریخی پس از یا برابر با :date باشد.',
    'alpha' => 'فیلد :attribute فقط باید شامل حروف باشد.',
    'alpha_dash' => 'فیلد :attribute فقط باید شامل حروف، اعداد، خط تیره و زیرخط باشد.',
    'alpha_num' => 'فیلد :attribute فقط باید شامل حروف و اعداد باشد.',
    'array' => 'فیلد :attribute باید یک آرایه باشد.',
    'before' => 'فیلد :attribute باید تاریخی قبل از :date باشد.',
    'before_or_equal' => 'فیلد :attribute باید تاریخی قبل از یا برابر با :date باشد.',
    'between' => [
        'numeric' => 'فیلد :attribute باید بین :min و :max باشد.',
        'file' => 'فیلد :attribute باید بین :min و :max کیلوبایت باشد.',
        'string' => 'فیلد :attribute باید بین :min و :max کاراکتر باشد.',
        'array' => 'فیلد :attribute باید بین :min و :max آیتم داشته باشد.',
    ],
    'boolean' => 'فیلد :attribute باید true یا false باشد.',
    'confirmed' => 'تأیید فیلد :attribute مطابقت ندارد.',
    'current_password' => 'رمز عبور نادرست است.',
    'date' => 'فیلد :attribute یک تاریخ معتبر نیست.',
    'date_equals' => 'فیلد :attribute باید تاریخی برابر با :date باشد.',
    'date_format' => 'فیلد :attribute با فرمت :format مطابقت ندارد.',
    'declined' => 'فیلد :attribute باید رد شود.',
    'declined_if' => 'فیلد :attribute باید رد شود وقتی :other برابر با :value باشد.',
    'different' => 'فیلد :attribute و :other باید متفاوت باشند.',
    'digits' => 'فیلد :attribute باید :digits رقم باشد.',
    'digits_between' => 'فیلد :attribute باید بین :min و :max رقم باشد.',
    'dimensions' => 'فیلد :attribute دارای ابعاد تصویر نامعتبر است.',
    'distinct' => 'فیلد :attribute دارای مقدار تکراری است.',
    'email' => 'فیلد :attribute باید یک آدرس ایمیل معتبر باشد.',
    'ends_with' => 'فیلد :attribute باید با یکی از مقادیر زیر پایان یابد: :values.',
    'enum' => 'مقدار انتخاب‌شده برای :attribute نامعتبر است.',
    'exists' => 'مقدار انتخاب‌شده برای :attribute نامعتبر است.',
    'file' => 'فیلد :attribute باید یک فایل باشد.',
    'filled' => 'فیلد :attribute باید دارای مقدار باشد.',
    'gt' => [
        'numeric' => 'فیلد :attribute باید بزرگ‌تر از :value باشد.',
        'file' => 'فیلد :attribute باید بزرگ‌تر از :value کیلوبایت باشد.',
        'string' => 'فیلد :attribute باید بیش از :value کاراکتر باشد.',
        'array' => 'فیلد :attribute باید بیش از :value آیتم داشته باشد.',
    ],
    'gte' => [
        'numeric' => 'فیلد :attribute باید بزرگ‌تر یا برابر با :value باشد.',
        'file' => 'فیلد :attribute باید بزرگ‌تر یا برابر با :value کیلوبایت باشد.',
        'string' => 'فیلد :attribute باید بیش از یا برابر با :value کاراکتر باشد.',
        'array' => 'فیلد :attribute باید :value آیتم یا بیشتر داشته باشد.',
    ],
    'image' => 'فیلد :attribute باید یک تصویر باشد.',
    'in' => 'مقدار انتخاب‌شده برای :attribute نامعتبر است.',
    'in_array' => 'فیلد :attribute در :other وجود ندارد.',
    'integer' => 'فیلد :attribute باید یک عدد صحیح باشد.',
    'ip' => 'فیلد :attribute باید یک آدرس IP معتبر باشد.',
    'ipv4' => 'فیلد :attribute باید یک آدرس IPv4 معتبر باشد.',
    'ipv6' => 'فیلد :attribute باید یک آدرس IPv6 معتبر باشد.',
    'json' => 'فیلد :attribute باید یک رشته JSON معتبر باشد.',
    'lt' => [
        'numeric' => 'فیلد :attribute باید کمتر از :value باشد.',
        'file' => 'فیلد :attribute باید کمتر از :value کیلوبایت باشد.',
        'string' => 'فیلد :attribute باید کمتر از :value کاراکتر باشد.',
        'array' => 'فیلد :attribute باید کمتر از :value آیتم داشته باشد.',
    ],
    'lte' => [
        'numeric' => 'فیلد :attribute باید کمتر یا برابر با :value باشد.',
        'file' => 'فیلد :attribute باید کمتر یا برابر با :value کیلوبایت باشد.',
        'string' => 'فیلد :attribute باید کمتر یا برابر با :value کاراکتر باشد.',
        'array' => 'فیلد :attribute نباید بیش از :value آیتم داشته باشد.',
    ],
    'mac_address' => 'فیلد :attribute باید یک آدرس MAC معتبر باشد.',
    'max' => [
        'numeric' => 'فیلد :attribute نباید بزرگ‌تر از :max باشد.',
        'file' => 'فیلد :attribute نباید بزرگ‌تر از :max کیلوبایت باشد.',
        'string' => 'فیلد :attribute نباید بیش از :max کاراکتر باشد.',
        'array' => 'فیلد :attribute نباید بیش از :max آیتم داشته باشد.',
    ],
    'mimes' => 'فیلد :attribute باید یک فایل از نوع: :values باشد.',
    'mimetypes' => 'فیلد :attribute باید یک فایل از نوع: :values باشد.',
    'min' => [
        'numeric' => 'فیلد :attribute باید حداقل :min باشد.',
        'file' => 'فیلد :attribute باید حداقل :min کیلوبایت باشد.',
        'string' => 'فیلد :attribute باید حداقل :min کاراکتر باشد.',
        'array' => 'فیلد :attribute باید حداقل :min آیتم داشته باشد.',
    ],
    'multiple_of' => 'فیلد :attribute باید مضربی از :value باشد.',
    'not_in' => 'مقدار انتخاب‌شده برای :attribute نامعتبر است.',
    'not_regex' => 'فرمت فیلد :attribute نامعتبر است.',
    'numeric' => 'فیلد :attribute باید یک عدد باشد.',
    'password' => 'رمز عبور نادرست است.',
    'present' => 'فیلد :attribute باید وجود داشته باشد.',
    'prohibited' => 'فیلد :attribute ممنوع است.',
    'prohibited_if' => 'فیلد :attribute وقتی :other برابر با :value باشد ممنوع است.',
    'prohibited_unless' => 'فیلد :attribute ممنوع است مگر اینکه :other در :values باشد.',
    'prohibits' => 'فیلد :attribute مانع حضور :other می‌شود.',
    'regex' => 'فرمت فیلد :attribute نامعتبر است.',
    'required' => 'فیلد :attribute الزامی است.',
    'required_array_keys' => 'فیلد :attribute باید شامل ورودی‌هایی برای: :values باشد.',
    'required_if' => 'فیلد :attribute وقتی :other برابر با :value باشد الزامی است.',
    'required_unless' => 'فیلد :attribute الزامی است مگر اینکه :other در :values باشد.',
    'required_with' => 'فیلد :attribute وقتی :values وجود دارد الزامی است.',
    'required_with_all' => 'فیلد :attribute وقتی همه :values وجود دارند الزامی است.',
    'required_without' => 'فیلد :attribute وقتی :values وجود ندارد الزامی است.',
    'required_without_all' => 'فیلد :attribute وقتی هیچ‌کدام از :values وجود ندارند الزامی است.',
    'same' => 'فیلد :attribute و :other باید یکسان باشند.',
    'size' => [
        'numeric' => 'فیلد :attribute باید :size باشد.',
        'file' => 'فیلد :attribute باید :size کیلوبایت باشد.',
        'string' => 'فیلد :attribute باید :size کاراکتر باشد.',
        'array' => 'فیلد :attribute باید شامل :size آیتم باشد.',
    ],
    'starts_with' => 'فیلد :attribute باید با یکی از مقادیر زیر شروع شود: :values.',
    'string' => 'فیلد :attribute باید یک رشته باشد.',
    'timezone' => 'فیلد :attribute باید یک منطقه زمانی معتبر باشد.',
    'unique' => 'فیلد :attribute قبلاً استفاده شده است.',
    'uploaded' => 'فیلد :attribute در آپلود ناموفق بود.',
    'url' => 'فیلد :attribute باید یک URL معتبر باشد.',
    'uuid' => 'فیلد :attribute باید یک UUID معتبر باشد.',

    /*
    |--------------------------------------------------------------------------
    | خطوط زبان اعتبارسنجی سفارشی
    |--------------------------------------------------------------------------
    |
    | در اینجا می‌توانید پیام‌های اعتبارسنجی سفارشی برای ویژگی‌ها را با استفاده از
    | قرارداد "attribute.rule" برای نام‌گذاری خطوط مشخص کنید. این کار امکان
    | تعیین سریع یک خط زبان سفارشی برای یک قانون خاص ویژگی را فراهم می‌کند.
    |
    */

    'custom' => [
        'attribute-name' => [
            'rule-name' => 'پیام سفارشی',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | ویژگی‌های اعتبارسنجی سفارشی
    |--------------------------------------------------------------------------
    |
    | خطوط زبان زیر برای جایگزینی placeholder ویژگی‌های ما با چیزی کاربرپسندتر
    | مانند "آدرس ایمیل" به جای "email" استفاده می‌شوند. این کار به ما کمک می‌کند
    | پیام‌هایمان را گویاتر کنیم.
    |
    */

    'attributes' => [],

];
