<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\AsArrayObject;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Topics 26 (mass assignment), 27 (relationships), 32 (accessors/mutators/casts),
 * 49 (Sanctum tokens), 52 (roles), 57 (MustVerifyEmail).
 */
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    // Allow list: is_admin, is_super_admin and role are NOT here, so a forged form field is ignored.
    protected $fillable = [
        'name', 'email', 'password', 'first_name', 'last_name', 'phone', 'settings',
        'plan', 'subscribed', 'notified', 'active', 'country_id', 'tenant_id',
    ];

    // Mirror the column defaults so a freshly created model has them too (strict mode would
    // otherwise throw MissingAttributeException when they are read before a refresh).
    protected $attributes = [
        'is_admin' => false, 'is_super_admin' => false, 'role' => 'member',
        'subscribed' => false, 'notified' => false, 'active' => true,
        'first_name' => null, 'last_name' => null, 'plan' => null, 'country_id' => null, 'tenant_id' => null,
    ];

    protected $hidden = ['password', 'remember_token', 'phone'];

    protected $appends = ['full_name'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',             // auto-hash on assignment
            'phone' => 'encrypted',             // encrypted at rest with APP_KEY
            'settings' => AsArrayObject::class,
            'is_admin' => 'boolean',
            'is_super_admin' => 'boolean',
            'subscribed' => 'boolean',
            'notified' => 'boolean',
            'active' => 'boolean',
        ];
    }

    // Accessor: $user->full_name
    protected function fullName(): Attribute
    {
        return Attribute::make(get: fn () => trim("{$this->first_name} {$this->last_name}") ?: $this->name);
    }

    // Mutator: emails are stored trimmed and lower-cased
    protected function email(): Attribute
    {
        return Attribute::make(set: fn (string $value) => strtolower(trim($value)));
    }

    public function scopeSubscribed(Builder $query): void
    {
        $query->where('subscribed', true);
    }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function latestPost(): HasOne
    {
        return $this->hasOne(Post::class)->latestOfMany();
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)->withPivot('assigned_at')->withTimestamps();
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function rooms(): BelongsToMany
    {
        return $this->belongsToMany(Room::class);
    }

    public function vendor(): HasOne
    {
        return $this->hasOne(Vendor::class);
    }

    public function campaignSends(): HasMany
    {
        return $this->hasMany(CampaignSend::class);
    }

    public function isAdmin(): bool
    {
        return (bool) $this->is_admin;
    }

    /** Topic 20: "basic" is satisfied by basic or pro; "pro" needs pro. */
    public function subscribedTo(string $plan): bool
    {
        return match ($plan) {
            'basic' => in_array($this->plan, ['basic', 'pro'], true),
            'pro' => $this->plan === 'pro',
            default => false,
        };
    }

    /** Topic 52: a minimal home-made RBAC (spatie/laravel-permission does this for real apps). */
    public function assignRole(string $name): void
    {
        $this->roles()->syncWithoutDetaching([Role::firstOrCreate(['name' => $name])->id => ['assigned_at' => now()]]);
        $this->unsetRelation('roles');
    }

    public function hasRole(string $name): bool
    {
        return $this->roles->contains('name', $name);
    }

    public function hasPermission(string $permission): bool
    {
        return $this->roles()->whereHas('permissions', fn ($q) => $q->where('name', $permission))->exists();
    }
}
