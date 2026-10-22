<?php

namespace App\Enums;

/** Topics 90, 100: backed enum with behaviour, cast on Order::status and validated with Rule::enum. */
enum OrderStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Failed = 'failed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    public function canCancel(): bool
    {
        return $this === self::Pending;
    }
}
