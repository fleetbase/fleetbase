<x-mail-layout>
<h2 style="font-size: 18px; font-weight: 600;">
@if($currentHour < 12)
    Hi {{ $user->name }}!
@elseif($currentHour < 18)
Hi {{ $user->name }}!
@else
Hi {{ $user->name }}!
@endif
</h2>

@if($content)
{!! $content !!}
@else
Welcome to {{ $appName }}, use the code below to verify your email address and complete registration to {{ $appName }}.
<br />
<br />
Your verification code: `{{ $code }}`
<br />
@endif

@if($type === 'email_verification')
    @component('mail::button', ['url' => \Fleetbase\Support\Utils::consoleUrl('onboard/verify-email', ['hello' => base64_encode($user->uuid), 'code' => $code ])])
        Verify Email
    @endcomponent
@endif

</x-mail-layout>
