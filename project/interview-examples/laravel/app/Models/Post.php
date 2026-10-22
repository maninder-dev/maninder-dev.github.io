<?php

namespace App\Models;

use App\Enums\PostStatus;
use App\Observers\PostObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Topics 25 (model + casts), 27 (relations), 31 (local scopes), 33 (observer), 34 (soft deletes + prune).
 */
#[ObservedBy(PostObserver::class)]
class Post extends Model
{
    use HasFactory, Prunable, SoftDeletes;

    protected $fillable = ['title', 'slug', 'body', 'status', 'published_at', 'views', 'meta', 'is_featured'];

    protected $attributes = ['status' => 'draft', 'views' => 0, 'is_featured' => false, 'published_at' => null, 'meta' => null];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'meta' => 'array',
            'status' => PostStatus::class,
            'is_featured' => 'boolean',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    // Local scope: Post::published()->popular(100)->get()
    public function scopePublished(Builder $query): void
    {
        $query->where('status', PostStatus::Published)->where('published_at', '<=', now());
    }

    public function scopePopular(Builder $query, int $minViews = 1000): void
    {
        $query->where('views', '>=', $minViews);
    }

    // Permanently delete posts that have been in the trash for 30+ days (php artisan model:prune)
    public function prunable(): Builder
    {
        return static::onlyTrashed()->where('deleted_at', '<', now()->subDays(30));
    }
}
