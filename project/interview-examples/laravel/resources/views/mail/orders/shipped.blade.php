<x-mail::message>
# Your order is on its way

Order #{{ $order->id }} ({{ $order->total_formatted }}) has shipped.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
