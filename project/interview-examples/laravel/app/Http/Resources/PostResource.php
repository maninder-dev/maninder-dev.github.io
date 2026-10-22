<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/** Topic 23: you decide exactly which fields leave the server. */
class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'excerpt' => Str::limit((string) $this->body, 120),
            'author' => new UserResource($this->whenLoaded('author')),   // only if eager loaded
            'comments_count' => $this->whenCounted('comments'),
            'is_owner' => $request->user()?->id === $this->user_id,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
