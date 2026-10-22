<?php

namespace App\Services;

/** Topic 5: bound with scoped(), one object per request or job (flushed between Octane requests). */
class CartManager
{
    public array $items = [];
}
