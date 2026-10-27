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

    'accepted' => 'Потрібно прийняти :attribute.',
    'accepted_if' => 'Потрібно прийняти :attribute, коли :other має значення :value.',
    'active_url' => 'Поле :attribute не є дійсною URL-адресою.',
    'after' => 'Поле :attribute має містити дату після :date.',
    'after_or_equal' => 'Поле :attribute має містити дату не раніше :date.',
    'alpha' => 'Поле :attribute має містити лише літери.',
    'alpha_dash' => 'Поле :attribute має містити лише літери, цифри, дефіси та підкреслення.',
    'alpha_num' => 'Поле :attribute має містити лише літери та цифри.',
    'array' => 'Поле :attribute має бути масивом.',
    'before' => 'Поле :attribute має містити дату до :date.',
    'before_or_equal' => 'Поле :attribute має містити дату не пізніше :date.',
    'between' => [
        'numeric' => 'Поле :attribute має бути між :min і :max.',
        'file' => 'Розмір файлу :attribute має бути від :min до :max КБ.',
        'string' => 'Поле :attribute має містити від :min до :max символів.',
        'array' => 'Поле :attribute має містити від :min до :max елементів.',
    ],
    'boolean' => 'Поле :attribute має бути true або false.',
    'confirmed' => 'Підтвердження поля :attribute не збігається.',
    'current_password' => 'Неправильний пароль.',
    'date' => 'Поле :attribute не є дійсною датою.',
    'date_equals' => 'Поле :attribute має містити дату :date.',
    'date_format' => 'Поле :attribute не відповідає формату :format.',
    'declined' => 'Потрібно відхилити :attribute.',
    'declined_if' => 'Потрібно відхилити :attribute, коли :other має значення :value.',
    'different' => 'Поля :attribute і :other мають відрізнятися.',
    'digits' => 'Поле :attribute має містити :digits цифр.',
    'digits_between' => 'Поле :attribute має містити від :min до :max цифр.',
    'dimensions' => 'Зображення :attribute має неприпустимі розміри.',
    'distinct' => 'Поле :attribute містить значення, що повторюється.',
    'email' => 'Поле :attribute має бути дійсною адресою електронної пошти.',
    'ends_with' => 'Поле :attribute має закінчуватися одним із таких значень: :values.',
    'enum' => 'Вибране значення :attribute недійсне.',
    'exists' => 'Вибране значення :attribute недійсне.',
    'file' => 'Поле :attribute має бути файлом.',
    'filled' => 'Поле :attribute має бути заповнене.',
    'gt' => [
        'numeric' => 'Поле :attribute має бути більшим за :value.',
        'file' => 'Розмір файлу :attribute має перевищувати :value КБ.',
        'string' => 'Поле :attribute має містити більше ніж :value символів.',
        'array' => 'Поле :attribute має містити більше ніж :value елементів.',
    ],
    'gte' => [
        'numeric' => 'Поле :attribute має бути не меншим за :value.',
        'file' => 'Розмір файлу :attribute має бути не меншим за :value КБ.',
        'string' => 'Поле :attribute має містити щонайменше :value символів.',
        'array' => 'Поле :attribute має містити :value або більше елементів.',
    ],
    'image' => 'Поле :attribute має бути зображенням.',
    'in' => 'Вибране значення :attribute недійсне.',
    'in_array' => 'Значення поля :attribute відсутнє в :other.',
    'integer' => 'Поле :attribute має бути цілим числом.',
    'ip' => 'Поле :attribute має бути дійсною IP-адресою.',
    'ipv4' => 'Поле :attribute має бути дійсною IPv4-адресою.',
    'ipv6' => 'Поле :attribute має бути дійсною IPv6-адресою.',
    'json' => 'Поле :attribute має бути дійсним JSON-рядком.',
    'lt' => [
        'numeric' => 'Поле :attribute має бути меншим за :value.',
        'file' => 'Розмір файлу :attribute має бути меншим за :value КБ.',
        'string' => 'Поле :attribute має містити менше ніж :value символів.',
        'array' => 'Поле :attribute має містити менше ніж :value елементів.',
    ],
    'lte' => [
        'numeric' => 'Поле :attribute має бути не більшим за :value.',
        'file' => 'Розмір файлу :attribute має бути не більшим за :value КБ.',
        'string' => 'Поле :attribute має містити не більше ніж :value символів.',
        'array' => 'Поле :attribute має містити не більше ніж :value елементів.',
    ],
    'mac_address' => 'Поле :attribute має бути дійсною MAC-адресою.',
    'max' => [
        'numeric' => 'Поле :attribute не може бути більшим за :max.',
        'file' => 'Розмір файлу :attribute не може перевищувати :max КБ.',
        'string' => 'Поле :attribute не може містити більше ніж :max символів.',
        'array' => 'Поле :attribute не може містити більше ніж :max елементів.',
    ],
    'mimes' => 'Поле :attribute має бути файлом одного з типів: :values.',
    'mimetypes' => 'Поле :attribute має бути файлом одного з типів: :values.',
    'min' => [
        'numeric' => 'Поле :attribute має бути щонайменше :min.',
        'file' => 'Розмір файлу :attribute має бути щонайменше :min КБ.',
        'string' => 'Поле :attribute має містити щонайменше :min символів.',
        'array' => 'Поле :attribute має містити щонайменше :min елементів.',
    ],
    'multiple_of' => 'Поле :attribute має бути кратним :value.',
    'not_in' => 'Вибране значення :attribute недійсне.',
    'not_regex' => 'Неправильний формат поля :attribute.',
    'numeric' => 'Поле :attribute має бути числом.',
    'password' => 'Неправильний пароль.',
    'present' => 'Поле :attribute має бути присутнім.',
    'prohibited' => 'Поле :attribute заборонене.',
    'prohibited_if' => 'Поле :attribute заборонене, коли :other має значення :value.',
    'prohibited_unless' => 'Поле :attribute заборонене, якщо :other не входить до :values.',
    'prohibits' => 'Поле :attribute забороняє наявність :other.',
    'regex' => 'Неправильний формат поля :attribute.',
    'required' => 'Поле :attribute обов’язкове.',
    'required_array_keys' => 'Поле :attribute має містити записи для: :values.',
    'required_if' => 'Поле :attribute обов’язкове, коли :other має значення :value.',
    'required_unless' => 'Поле :attribute обов’язкове, якщо :other не входить до :values.',
    'required_with' => 'Поле :attribute обов’язкове, коли вказано :values.',
    'required_with_all' => 'Поле :attribute обов’язкове, коли вказано всі :values.',
    'required_without' => 'Поле :attribute обов’язкове, коли не вказано :values.',
    'required_without_all' => 'Поле :attribute обов’язкове, коли не вказано жодне з :values.',
    'same' => 'Поля :attribute і :other мають збігатися.',
    'size' => [
        'numeric' => 'Поле :attribute має дорівнювати :size.',
        'file' => 'Розмір файлу :attribute має становити :size КБ.',
        'string' => 'Поле :attribute має містити :size символів.',
        'array' => 'Поле :attribute має містити :size елементів.',
    ],
    'starts_with' => 'Поле :attribute має починатися з одного з таких значень: :values.',
    'string' => 'Поле :attribute має бути рядком.',
    'timezone' => 'Поле :attribute має бути дійсним часовим поясом.',
    'unique' => 'Таке значення :attribute вже використовується.',
    'uploaded' => 'Не вдалося завантажити :attribute.',
    'url' => 'Поле :attribute має бути дійсною URL-адресою.',
    'uuid' => 'Поле :attribute має бути дійсним UUID.',

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
        'address' => 'адреса',
        'cart' => 'кошик',
        'code' => 'код',
        'content' => 'вміст',
        'customer' => 'покупець',
        'date' => 'дата',
        'destination' => 'адреса доставки',
        'email' => 'електронна пошта',
        'files' => 'файли',
        'first_name' => 'ім’я',
        'gateway' => 'спосіб оплати',
        'identity' => 'електронна пошта або телефон',
        'last_name' => 'прізвище',
        'message' => 'повідомлення',
        'name' => 'ім’я',
        'order' => 'замовлення',
        'origin' => 'адреса відправлення',
        'password' => 'пароль',
        'password_confirmation' => 'підтвердження пароля',
        'phone' => 'телефон',
        'rating' => 'оцінка',
        'subject' => 'об’єкт відгуку',
        'token' => 'токен',
    ],

];
