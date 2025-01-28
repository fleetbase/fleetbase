<x-mail-layout>
<h2 style="font-size: 18px; font-weight: 600;">
@if($currentHour < 12)
    Good Morning, {{ $user->name }}!
@elseif($currentHour < 18)
    Good Afternoon, {{ $user->name }}!
@else
    Good Evening, {{ $user->name }}!
@endif
</h2>

Your login credentials:
<br />
<br />
Your Email: {{ $user->email }}
<br />
Your Password: {{ $plaintextPassword }}
<br />
Console URL: {{ \Fleetbase\Support\Utils::consoleUrl() }}
</x-mail-layout>
