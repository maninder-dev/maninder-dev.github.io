<?php

use App\Models\Tenant;
use App\Support\CurrentTenant;

if (! function_exists('tenant')) {
    /** Topic 88: the tenant for the current request/job (a scoped binding, safe under Octane). */
    function tenant(): ?Tenant
    {
        return app(CurrentTenant::class)->get();
    }
}
