<?php

namespace App\Support;

use App\Models\Tenant;

/** Topic 88: holds the tenant for this request/job. Bound with scoped(), so it resets between Octane requests. */
class CurrentTenant
{
    private ?Tenant $tenant = null;

    public function set(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    public function get(): ?Tenant
    {
        return $this->tenant;
    }
}
