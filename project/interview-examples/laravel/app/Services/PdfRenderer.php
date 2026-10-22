<?php

namespace App\Services;

use Illuminate\Filesystem\Filesystem;

/** Topic 92: never bound; the container auto-wires Filesystem into it. */
class PdfRenderer
{
    public function __construct(public readonly Filesystem $files) {}
}
