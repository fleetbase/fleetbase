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

    'accepted' => ':Attribute-г зөвшөөрсөн байх ёстой.',
    'accepted_if' => ':other нь :value үед :attribute-г зөвшөөрсөн байх ёстой.',
    'active_url' => ':Attribute хүчинтэй URL биш байна.',
    'after' => ':Attribute нь :date-ээс хойшх огноо байх ёстой.',
    'after_or_equal' => ':Attribute нь :date эсвэл түүнээс хойшх огноо байх ёстой.',
    'alpha' => ':Attribute зөвхөн үсгээс бүрдэх ёстой.',
    'alpha_dash' => ':Attribute зөвхөн үсэг, тоо, зураас, доогуур зураас агуулах ёстой.',
    'alpha_num' => ':Attribute зөвхөн үсэг, тооноос бүрдэх ёстой.',
    'array' => ':Attribute массив байх ёстой.',
    'before' => ':Attribute нь :date-ээс өмнөх огноо байх ёстой.',
    'before_or_equal' => ':Attribute нь :date эсвэл түүнээс өмнөх огноо байх ёстой.',
    'between' => [
        'numeric' => ':Attribute :min-ээс :max-ын хооронд байх ёстой.',
        'file' => ':Attribute :min-ээс :max килобайтын хооронд байх ёстой.',
        'string' => ':Attribute :min-ээс :max тэмдэгтийн хооронд байх ёстой.',
        'array' => ':Attribute :min-ээс :max элементтэй байх ёстой.',
    ],
    'boolean' => ':Attribute талбар үнэн эсвэл худал байх ёстой.',
    'confirmed' => ':Attribute баталгаажуулалт таарахгүй байна.',
    'current_password' => 'Нууц үг буруу байна.',
    'date' => ':Attribute хүчинтэй огноо биш байна.',
    'date_equals' => ':Attribute нь :date-тэй тэнцүү огноо байх ёстой.',
    'date_format' => ':Attribute :format форматтай таарахгүй байна.',
    'declined' => ':Attribute-г татгалзсан байх ёстой.',
    'declined_if' => ':other нь :value үед :attribute-г татгалзсан байх ёстой.',
    'different' => ':Attribute болон :other өөр байх ёстой.',
    'digits' => ':Attribute :digits оронтой тоо байх ёстой.',
    'digits_between' => ':Attribute :min-ээс :max оронтой байх ёстой.',
    'dimensions' => ':Attribute зургийн хэмжээ буруу байна.',
    'distinct' => ':Attribute талбарт давхардсан утга байна.',
    'email' => ':Attribute хүчинтэй имэйл хаяг байх ёстой.',
    'ends_with' => ':Attribute дараахын аль нэгээр төгсөх ёстой: :values.',
    'enum' => 'Сонгосон :attribute буруу байна.',
    'exists' => 'Сонгосон :attribute буруу байна.',
    'file' => ':Attribute файл байх ёстой.',
    'filled' => ':Attribute талбарт утга оруулах ёстой.',
    'gt' => [
        'numeric' => ':Attribute :value-ээс их байх ёстой.',
        'file' => ':Attribute :value килобайтаас их байх ёстой.',
        'string' => ':Attribute :value тэмдэгтээс урт байх ёстой.',
        'array' => ':Attribute :value-ээс олон элементтэй байх ёстой.',
    ],
    'gte' => [
        'numeric' => ':Attribute :value буюу түүнээс их байх ёстой.',
        'file' => ':Attribute :value килобайт буюу түүнээс их байх ёстой.',
        'string' => ':Attribute :value буюу түүнээс олон тэмдэгттэй байх ёстой.',
        'array' => ':Attribute :value буюу түүнээс олон элементтэй байх ёстой.',
    ],
    'image' => ':Attribute зураг байх ёстой.',
    'in' => 'Сонгосон :attribute буруу байна.',
    'in_array' => ':Attribute талбар :other-д байхгүй байна.',
    'integer' => ':Attribute бүхэл тоо байх ёстой.',
    'ip' => ':Attribute хүчинтэй IP хаяг байх ёстой.',
    'ipv4' => ':Attribute хүчинтэй IPv4 хаяг байх ёстой.',
    'ipv6' => ':Attribute хүчинтэй IPv6 хаяг байх ёстой.',
    'json' => ':Attribute хүчинтэй JSON мөр байх ёстой.',
    'lt' => [
        'numeric' => ':Attribute :value-ээс бага байх ёстой.',
        'file' => ':Attribute :value килобайтаас бага байх ёстой.',
        'string' => ':Attribute :value тэмдэгтээс богино байх ёстой.',
        'array' => ':Attribute :value-ээс цөөн элементтэй байх ёстой.',
    ],
    'lte' => [
        'numeric' => ':Attribute :value буюу түүнээс бага байх ёстой.',
        'file' => ':Attribute :value килобайт буюу түүнээс бага байх ёстой.',
        'string' => ':Attribute :value буюу түүнээс цөөн тэмдэгттэй байх ёстой.',
        'array' => ':Attribute :value-ээс олон элементтэй байж болохгүй.',
    ],
    'mac_address' => ':Attribute хүчинтэй MAC хаяг байх ёстой.',
    'max' => [
        'numeric' => ':Attribute :max-ээс их байж болохгүй.',
        'file' => ':Attribute :max килобайтаас их байж болохгүй.',
        'string' => ':Attribute :max тэмдэгтээс урт байж болохгүй.',
        'array' => ':Attribute :max-ээс олон элементтэй байж болохгүй.',
    ],
    'mimes' => ':Attribute дараах төрлийн файл байх ёстой: :values.',
    'mimetypes' => ':Attribute дараах төрлийн файл байх ёстой: :values.',
    'min' => [
        'numeric' => ':Attribute хамгийн багадаа :min байх ёстой.',
        'file' => ':Attribute хамгийн багадаа :min килобайт байх ёстой.',
        'string' => ':Attribute хамгийн багадаа :min тэмдэгттэй байх ёстой.',
        'array' => ':Attribute хамгийн багадаа :min элементтэй байх ёстой.',
    ],
    'multiple_of' => ':Attribute :value-ийн үржвэр байх ёстой.',
    'not_in' => 'Сонгосон :attribute буруу байна.',
    'not_regex' => ':Attribute формат буруу байна.',
    'numeric' => ':Attribute тоо байх ёстой.',
    'password' => 'Нууц үг буруу байна.',
    'present' => ':Attribute талбар байх ёстой.',
    'prohibited' => ':Attribute талбарыг оруулахыг хориглоно.',
    'prohibited_if' => ':other нь :value үед :attribute талбарыг оруулахыг хориглоно.',
    'prohibited_unless' => ':other нь :values-д байхгүй бол :attribute талбарыг оруулахыг хориглоно.',
    'prohibits' => ':Attribute талбар байвал :other байж болохгүй.',
    'regex' => ':Attribute формат буруу байна.',
    'required' => ':Attribute талбарыг заавал бөглөнө үү.',
    'required_array_keys' => ':Attribute талбарт дараах утгууд байх ёстой: :values.',
    'required_if' => ':other нь :value үед :attribute талбарыг заавал бөглөнө үү.',
    'required_unless' => ':other нь :values-д байхгүй бол :attribute талбарыг заавал бөглөнө үү.',
    'required_with' => ':values байгаа үед :attribute талбарыг заавал бөглөнө үү.',
    'required_with_all' => ':values бүгд байгаа үед :attribute талбарыг заавал бөглөнө үү.',
    'required_without' => ':values байхгүй үед :attribute талбарыг заавал бөглөнө үү.',
    'required_without_all' => ':values-ийн аль нь ч байхгүй үед :attribute талбарыг заавал бөглөнө үү.',
    'same' => ':Attribute болон :other таарах ёстой.',
    'size' => [
        'numeric' => ':Attribute :size байх ёстой.',
        'file' => ':Attribute :size килобайт байх ёстой.',
        'string' => ':Attribute :size тэмдэгттэй байх ёстой.',
        'array' => ':Attribute :size элементтэй байх ёстой.',
    ],
    'starts_with' => ':Attribute дараахын аль нэгээр эхлэх ёстой: :values.',
    'string' => ':Attribute тэмдэгт мөр байх ёстой.',
    'timezone' => ':Attribute хүчинтэй цагийн бүс байх ёстой.',
    'unique' => ':Attribute аль хэдийн бүртгэгдсэн байна.',
    'uploaded' => ':Attribute-г байршуулж чадсангүй.',
    'url' => ':Attribute хүчинтэй URL байх ёстой.',
    'uuid' => ':Attribute хүчинтэй UUID байх ёстой.',

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

    'attributes' => [
        'address' => 'хаяг',
        'cart' => 'сагс',
        'code' => 'код',
        'content' => 'агуулга',
        'customer' => 'хэрэглэгч',
        'date' => 'огноо',
        'destination' => 'хүргэх хаяг',
        'email' => 'имэйл',
        'files' => 'файлууд',
        'first_name' => 'нэр',
        'gateway' => 'төлбөрийн хэрэгсэл',
        'identity' => 'имэйл эсвэл утасны дугаар',
        'last_name' => 'овог',
        'message' => 'мессеж',
        'name' => 'нэр',
        'order' => 'захиалга',
        'origin' => 'авах хаяг',
        'password' => 'нууц үг',
        'password_confirmation' => 'нууц үгийн баталгаажуулалт',
        'phone' => 'утасны дугаар',
        'rating' => 'үнэлгээ',
        'subject' => 'үнэлгээний зүйл',
        'token' => 'токен',
    ],

];
