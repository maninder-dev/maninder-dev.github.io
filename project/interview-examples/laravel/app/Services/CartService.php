<?php

namespace App\Services;

use App\Models\User;

/** Topics 77 / 99: captures the user at construction time, which is what leaks under Octane if bound as a singleton. */
class CartService
{
    public function __construct(public readonly ?User $user) {}

    public function ownerName(): ?string
    {
        return $this->user?->name;
    }
}
