<x-mail::layout>
    {{-- Header --}}
   

    {{-- Body --}}
    {{ $slot }}

    {{-- Subcopy --}}
    @isset($subcopy)
    <x-slot:subcopy>
        <x-mail::subcopy>
            {{ $subcopy }}
        </x-mail::subcopy>
    </x-slot:subcopy>
    @endisset

  
</x-mail::layout>