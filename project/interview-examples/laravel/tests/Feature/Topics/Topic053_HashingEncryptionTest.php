<?php

namespace Tests\Feature\Topics;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Topic 053: Hashing and Encryption (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic053
 *
 * Hash = one-way (passwords). Crypt = two-way with APP_KEY (data you must read back).
 */
class Topic053_HashingEncryptionTest extends TestCase
{
    public function test_hashing_is_one_way_and_salted(): void
    {
        $hash = Hash::make('secret-password');

        $this->assertTrue(Hash::check('secret-password', $hash));
        $this->assertFalse(Hash::check('wrong', $hash));
        $this->assertNotSame($hash, Hash::make('secret-password'));     // random salt each time
        $this->assertStringStartsWith('$2y$', $hash);                     // bcrypt
        $this->assertTrue(Hash::needsRehash(Hash::make('x', ['rounds' => 5])));   // cost changed (tests use 4)
    }

    public function test_encryption_round_trips_and_detects_tampering(): void
    {
        $cipher = Crypt::encryptString('1234-5678-9012');

        $this->assertSame('1234-5678-9012', Crypt::decryptString($cipher));

        $payload = json_decode(base64_decode($cipher), true);
        $payload['value'] = base64_encode('tampered');
        $this->expectException(DecryptException::class);
        Crypt::decryptString(base64_encode(json_encode($payload)));
    }

    public function test_a_different_app_key_cannot_decrypt(): void
    {
        $cipher = Crypt::encryptString('secret');
        $otherApp = new Encrypter(random_bytes(32), 'AES-256-CBC');

        $this->expectException(DecryptException::class);
        $otherApp->decryptString($cipher);         // why APP_KEY rotation needs APP_PREVIOUS_KEYS
    }
}
