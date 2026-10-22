<?php

namespace App\Http\Controllers;

/** Topic 15: a single-action (invokable) controller. */
class ShowDashboard extends Controller
{
    public function __invoke()
    {
        return response('Welcome, '.e(auth()->user()->name));
    }
}
