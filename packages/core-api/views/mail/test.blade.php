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

<p>🎉 This is a test email from Fleetbase to confirm that your mail configuration works.</p>
<table>
    <tbody>
        <tr>
            <td><strong>MAILER:</strong></td>
            <td>{{ strtoupper($mailer) }}</td>
        </tr>
        <tr>
            <td><strong>ENVIRONMENT:</strong></td>
            <td>{{ strtoupper(app()->environment()) }}</td>
        </tr>
    </tbody>
</table>
</x-mail-layout>