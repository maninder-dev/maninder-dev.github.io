<?php

namespace Tests\Feature\Topics;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Topic 068: File Storage (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic068
 *
 * One API over local disks and S3. Storage::fake() swaps a disk for a temp folder, so S3 code
 * runs without AWS.
 */
class Topic068_FileStorageTest extends TestCase
{
    public function test_upload_gets_a_generated_name(): void
    {
        Storage::fake('public');

        $path = UploadedFile::fake()->image('my holiday.jpg')->store('avatars', 'public');

        $this->assertMatchesRegularExpression('#^avatars/[A-Za-z0-9]{40}\.jpg$#', $path);   // never trust the client name
        Storage::disk('public')->assertExists($path);
    }

    public function test_put_exists_delete_on_a_faked_s3_disk(): void
    {
        Storage::fake('s3');

        Storage::disk('s3')->put('reports/42.pdf', '%PDF-1.4');
        $this->assertTrue(Storage::disk('s3')->exists('reports/42.pdf'));
        $this->assertSame('%PDF-1.4', Storage::disk('s3')->get('reports/42.pdf'));

        Storage::disk('s3')->delete('reports/42.pdf');
        Storage::disk('s3')->assertMissing('reports/42.pdf');
    }

    public function test_temporary_url(): void
    {
        // A faked disk returns a fake expiring URL; on S3 this is a pre-signed AWS URL.
        Storage::fake('local');
        Storage::disk('local')->put('reports/q3.pdf', 'pdf');

        $url = Storage::disk('local')->temporaryUrl('reports/q3.pdf', now()->addMinutes(10));

        $this->assertStringContainsString('reports/q3.pdf?expiration='.now()->addMinutes(10)->timestamp, $url);
    }
}
