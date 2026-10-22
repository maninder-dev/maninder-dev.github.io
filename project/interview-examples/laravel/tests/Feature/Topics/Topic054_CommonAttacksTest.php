<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Topic 054: Protection Against Common Attacks (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic054
 *
 * SQL injection via interpolation (shown, then fixed with bindings and an allow list),
 * XSS escaping, security headers, upload validation. CSRF is Topic 21, mass assignment Topic 26.
 */
class Topic054_CommonAttacksTest extends TestCase
{
    use RefreshDatabase;

    public function test_sql_injection_with_interpolation_versus_bindings(): void
    {
        User::factory()->count(3)->create();
        $input = "0 OR 1=1";

        $unsafe = DB::select("SELECT * FROM users WHERE id = {$input}");     // UNSAFE
        $safe = DB::select('SELECT * FROM users WHERE id = ?', [$input]);    // SAFE: bound as a value

        $this->assertCount(3, $unsafe);                                       // leaked every row
        $this->assertCount(0, $safe);
        $this->assertCount(0, User::where('email', "' OR '1'='1")->get());
    }

    public function test_column_names_need_an_allow_list(): void
    {
        $sortFromRequest = 'name; DROP TABLE users';
        $sort = in_array($sortFromRequest, ['name', 'created_at'], true) ? $sortFromRequest : 'created_at';

        $this->assertSame('created_at', $sort);
        $this->assertStringContainsString('order by "created_at"', User::orderBy($sort)->toSql());
    }

    public function test_xss_is_escaped_and_headers_are_set(): void
    {
        $this->blade('{{ $name }}', ['name' => '<img src=x onerror=alert(1)>'])->assertDontSee('<img', false);

        $this->get('/hello')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_uploads_are_validated_by_real_mime_type(): void
    {
        $rules = ['avatar' => ['required', 'image', 'max:2048']];
        // A PHP script renamed to .jpg: the real content type (finfo) is checked, not the file name
        $tmp = tempnam(sys_get_temp_dir(), 'up');
        file_put_contents($tmp, '<?php system($_GET["c"]);');
        $php = new UploadedFile($tmp, 'avatar.jpg', null, null, true);

        $this->assertTrue(Validator::make(['avatar' => $php], $rules)->fails());
        $this->assertTrue(Validator::make(['avatar' => UploadedFile::fake()->image('a.jpg')], $rules)->passes());
    }
}
