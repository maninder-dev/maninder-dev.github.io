<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Database\Eloquent\Casts\ArrayObject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Topic 032: Accessors, Mutators and Casts (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic032
 */
class Topic032_AccessorsMutatorsCastsTest extends TestCase
{
    use RefreshDatabase;

    public function test_accessor_mutator_and_appends(): void
    {
        $user = User::factory()->create(['first_name' => 'Maninder', 'last_name' => 'Singh', 'email' => '  MS@Example.COM ']);

        $this->assertSame('Maninder Singh', $user->full_name);
        $this->assertSame('ms@example.com', $user->email);                  // mutator ran on set
        $json = $user->toArray();
        $this->assertSame('Maninder Singh', $json['full_name']);            // $appends
        $this->assertArrayNotHasKey('password', $json);                     // $hidden
        $this->assertArrayNotHasKey('remember_token', $json);
    }

    public function test_hashed_encrypted_and_array_object_casts(): void
    {
        $user = User::factory()->create(['password' => 'plain-text', 'phone' => '9876543210', 'settings' => ['theme' => 'dark']]);
        $row = DB::table('users')->find($user->id);

        $this->assertTrue(Hash::check('plain-text', $row->password));       // stored hashed
        $this->assertNotSame('9876543210', $row->phone);                     // stored encrypted
        $this->assertSame('9876543210', $user->fresh()->phone);              // decrypted on read

        $settings = $user->fresh()->settings;
        $this->assertInstanceOf(ArrayObject::class, $settings);
        $settings['theme'] = 'light';                                         // mutate in place
        $user->settings = $settings;
        $user->save();
        $this->assertSame('light', $user->fresh()->settings['theme']);
    }
}
