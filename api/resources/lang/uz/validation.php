<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Validation Language Lines
    |--------------------------------------------------------------------------
    |
    | The following language lines contain the default error messages used by
    | the validator class. Some of these rules have multiple versions such
    | as the size rules. Feel free to tweak each of these messages here.
    |
    */

    'accepted' => ':attribute qabul qilinishi kerak.',
    'accepted_if' => ':other :value bo‘lsa, :attribute qabul qilinishi kerak.',
    'active_url' => ':attribute yaroqli URL emas.',
    'after' => ':attribute :date dan keyingi sana boʻlishi kerak.',
    'after_or_equal' => ':attribute :date ga teng yoki undan keyingi sana boʻlishi kerak.',
    'alpha' => ':attribute faqat harflardan iborat boʻlishi kerak.',
    'alpha_dash' => ':attribute faqat harflar, raqamlar, chiziqlar va pastki chiziqlardan iborat boʻlishi kerak.',
    'alpha_num' => ':attribute faqat harflar va raqamlardan iborat boʻlishi kerak.',
    'array' => ':attribute massiv boʻlishi kerak.',
    'before' => ':attribute :date gacha boʻlgan sana boʻlishi kerak.',
    'before_or_equal' => ':attribute :date ga teng yoki undan oldingi sana boʻlishi kerak.',
    'between' => [
        'numeric' => ':attribute :min va :max orasida boʻlishi kerak.',
        'file' => ':attribute :min va :max kilobayt orasida boʻlishi kerak.',
        'string' => ':attribute :min va :max belgilar orasida boʻlishi kerak.',
        'array' => ':attribute :min va :max ta element orasida boʻlishi kerak.',
    ],
    'boolean' => ':attribute maydoni rost yoki yolgʻon boʻlishi kerak.',
    'confirmed' => ':attribute tasdiqlanishi mos kelmadi.',
    'current_password' => 'Parol noto‘g‘ri.',
    'date' => ':attribute yaroqli sana emas.',
    'date_equals' => ':attribute :date ga teng sana boʻlishi kerak.',
    'date_format' => ':attribute :format formatiga mos kelmadi.',
    'declined' => ':attribute rad etilishi kerak.',
    'declined_if' => ':other :value bo‘lsa, :attribute rad etilishi kerak.',
    'different' => ':attribute va :other har xil boʻlishi kerak.',
    'digits' => ':attribute :digits raqamdan iborat boʻlishi kerak.',
    'digits_between' => ':attribute :min va :max raqamlari orasida boʻlishi kerak.',
    'dimensions' => ':attribute rasm oʻlchamlari yaroqsiz.',
    'distinct' => ':attribute maydonida takroriy qiymat mavjud.',
    'email' => ':attribute yaroqli elektron pochta manzili boʻlishi kerak.',
    'ends_with' => ':attribute quyidagilardan biri bilan tugashi kerak: :values.',
    'enum' => 'Tanlangan :attribute yaroqsiz.',
    'exists' => 'Tanlangan :attribute yaroqsiz.',
    'file' => ':attribute fayl boʻlishi kerak.',
    'filled' => ':attribute maydonida qiymat boʻlishi kerak.',
    'gt' => [
        'numeric' => ':attribute :value dan katta boʻlishi kerak.',
        'file' => ':attribute :value kilobaytdan katta boʻlishi kerak.',
        'string' => ':attribute :value belgidan katta boʻlishi kerak.',
        'array' => ':attribute :value dan koʻp elementga ega boʻlishi kerak.',
    ],
    'gte' => [
        'numeric' => ':attribute :value ga teng yoki undan katta boʻlishi kerak.',
        'file' => ':attribute :value kilobaytga teng yoki undan katta boʻlishi kerak.',
        'string' => ':attribute :value belgiga teng yoki undan katta boʻlishi kerak.',
        'array' => ':attribute :value yoki undan koʻp elementga ega boʻlishi kerak.',
    ],
    'image' => ':attribute rasm boʻlishi kerak.',
    'in' => 'Tanlangan :attribute yaroqsiz.',
    'in_array' => ':attribute maydoni :other da mavjud emas.',
    'integer' => ':attribute butun son boʻlishi kerak.',
    'ip' => ':attribute yaroqli IP manzil boʻlishi kerak.',
    'ipv4' => ':attribute yaroqli IPv4 manzil boʻlishi kerak.',
    'ipv6' => ':attribute yaroqli IPv6 manzil boʻlishi kerak.',
    'json' => ':attribute yaroqli JSON qatori boʻlishi kerak.',
    'lt' => [
        'numeric' => ':attribute :value dan kichik boʻlishi kerak.',
        'file' => ':attribute :value kilobaytdan kichik boʻlishi kerak.',
        'string' => ':attribute :value belgidan kichik boʻlishi kerak.',
        'array' => ':attribute :value dan kam elementga ega boʻlishi kerak.',
    ],
    'lte' => [
        'numeric' => ':attribute :value ga teng yoki undan kichik boʻlishi kerak.',
        'file' => ':attribute :value kilobaytga teng yoki undan kichik boʻlishi kerak.',
        'string' => ':attribute :value belgiga teng yoki undan kichik boʻlishi kerak.',
        'array' => ':attribute :value dan koʻp boʻlmagan elementga ega boʻlishi kerak.',
    ],
    'mac_address' => ':attribute yaroqli MAC manzil boʻlishi kerak.',
    'max' => [
        'numeric' => ':attribute :max dan katta boʻlmasligi kerak.',
        'file' => ':attribute :max kilobaytdan katta boʻlmasligi kerak.',
        'string' => ':attribute :max belgidan katta boʻlmasligi kerak.',
        'array' => ':attribute :max dan koʻp boʻlmagan elementga ega boʻlishi kerak.',
    ],
    'mimes' => ':attribute :values turidagi fayl boʻlishi kerak.',
    'mimetypes' => ':attribute :values turidagi fayl boʻlishi kerak.',
    'min' => [
        'numeric' => ':attribute kamida :min boʻlishi kerak.',
        'file' => ':attribute kamida :min kilobayt boʻlishi kerak.',
        'string' => ':attribute kamida :min belgidan iborat boʻlishi kerak.',
        'array' => ':attribute kamida :min ta elementga ega boʻlishi kerak.',
    ],
    'multiple_of' => ':attribute :value ning karrali boʻlishi kerak.',
    'not_in' => 'Tanlangan :attribute yaroqsiz.',
    'not_regex' => ':attribute formati yaroqsiz.',
    'numeric' => ':attribute raqam boʻlishi kerak.',
    'password' => 'Parol noto‘g‘ri.',
    'present' => ':attribute maydoni mavjud boʻlishi kerak.',
    'prohibited' => ':attribute maydoni taqiqlangan.',
    'prohibited_if' => ':other :value bo‘lsa, :attribute maydoni taqiqlangan.',
    'prohibited_unless' => ':other :values da boʻlmasa, :attribute maydoni taqiqlangan.',
    'prohibits' => ':attribute maydoni :other ning mavjud boʻlishini taqiqlaydi.',
    'regex' => ':attribute formati yaroqsiz.',
    'required' => ':attribute maydoni toʻldirilishi shart.',
    'required_array_keys' => ':attribute maydonida :values uchun yozuvlar boʻlishi kerak.',
    'required_if' => ':other :value bo‘lsa, :attribute maydoni toʻldirilishi shart.',
    'required_unless' => ':other :values da boʻlmasa, :attribute maydoni toʻldirilishi shart.',
    'required_with' => ':values mavjud boʻlganda :attribute maydoni toʻldirilishi shart.',
    'required_with_all' => ':values mavjud boʻlganda :attribute maydoni toʻldirilishi shart.',
    'required_without' => ':values mavjud boʻlmaganda :attribute maydoni toʻldirilishi shart.',
    'required_without_all' => ':values ning hech biri mavjud boʻlmaganda :attribute maydoni toʻldirilishi shart.',
    'same' => ':attribute va :other mos kelishi kerak.',
    'size' => [
        'numeric' => ':attribute :size boʻlishi kerak.',
        'file' => ':attribute :size kilobayt boʻlishi kerak.',
        'string' => ':attribute :size belgidan iborat boʻlishi kerak.',
        'array' => ':attribute :size ta elementdan iborat boʻlishi kerak.',
    ],
    'starts_with' => ':attribute quyidagilardan biri bilan boshlanishi kerak: :values.',
    'string' => ':attribute qator boʻlishi kerak.',
    'timezone' => ':attribute yaroqli vaqt mintaqasi boʻlishi kerak.',
    'unique' => ':attribute allaqachon olingan.',
    'uploaded' => ':attribute yuklab olinmadi.',
    'url' => ':attribute yaroqli URL boʻlishi kerak.',
    'uuid' => ':attribute yaroqli UUID boʻlishi kerak.',

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Language Lines
    |--------------------------------------------------------------------------
    |
    | Here you may specify custom validation messages for attributes using the
    | convention "attribute.rule" to name the lines. This makes it quick to
    | specify a specific custom language line for a given attribute rule.
    |
    */

    'custom' => [
        'attribute-name' => [
            'rule-name' => 'custom-message',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Attributes
    |--------------------------------------------------------------------------
    |
    | The following language lines are used to swap our attribute placeholder
    | with something more reader friendly such as "E-Mail Address" instead
    | of "email". This simply helps us make our message more expressive.
    |
    */

    'attributes' => [],

];
