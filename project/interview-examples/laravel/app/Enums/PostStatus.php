<?php

namespace App\Enums;

/** Topics 25, 83: post lifecycle as a backed enum (cast on Post::status). */
enum PostStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';
}
