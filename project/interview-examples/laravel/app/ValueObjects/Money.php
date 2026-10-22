<?php

namespace App\ValueObjects;

use InvalidArgumentException;

/** Topic 85: an immutable value object. Amounts are integer paise, never floats. */
final readonly class Money
{
    public function __construct(public int $paise)
    {
        if ($paise < 0) {
            throw new InvalidArgumentException('Amount cannot be negative.');
        }
    }

    public static function of(int $paise): self
    {
        return new self($paise);
    }

    public function add(Money $other): self
    {
        return new self($this->paise + $other->paise);
    }

    public function equals(Money $other): bool
    {
        return $this->paise === $other->paise;
    }

    public function format(): string
    {
        return 'Rs. '.number_format($this->paise / 100, 2);
    }
}
