<?php

use App\Contracts\PaymentGateway;
use App\Enums\OrderStatus;
use App\Exceptions\CardDeclined;
use App\Exceptions\InsufficientStock;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ShowDashboard;
use App\Http\Requests\UpdateProfileRequest;
use App\Jobs\ProcessPaymentWebhook;
use App\Models\Comment;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Post;
use App\Models\Product;
use App\Pipelines\Filters;
use App\Rules\IndianPhone;
use App\Support\Trace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Pipeline;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', fn () => view('welcome'));

// Topic 1: a full page in three lines
Route::get('/latest-posts', fn () => view('posts.index', ['posts' => Post::with('author')->latest('id')->paginate(10)]));

// Topic 3: request lifecycle (terminable middleware)
Route::get('/lifecycle', function () {
    Trace::record('controller');

    return 'ok';
})->middleware('lifecycle');

// Topic 4: controller with an auto-wired service
Route::post('/payments', [PaymentController::class, 'store'])->middleware('auth');

// Topic 12: routing basics
Route::get('/articles/{id}', fn (int $id) => "Article {$id}")->whereNumber('id')->name('articles.show');
Route::match(['put', 'patch'], '/articles/{id}', fn (int $id) => "Updated {$id}")->whereNumber('id');
Route::redirect('/old-blog', '/posts', 301);
Route::get('/hello/{name?}', fn (?string $name = 'guest') => "Hello {$name}");

// Topic 13: groups, prefixes, names, sub-domains
Route::middleware(['auth', 'verified'])->prefix('dashboard')->name('dashboard.')->group(function () {
    Route::get('/', ShowDashboard::class)->name('home');                         // dashboard.home
    Route::get('/projects', fn () => 'projects')->name('projects.index');        // dashboard.projects.index
});
Route::domain('{account}.myapp.test')->group(function () {
    Route::get('/', fn (string $account) => "Workspace: {$account}");
});

// Topic 15: resource controller (7 routes); writes need a logged-in user
// (writes first, so /posts/create is not swallowed by /posts/{post})
Route::resource('posts', PostController::class)->except(['index', 'show'])->middleware('auth');
Route::resource('posts', PostController::class)->only(['index', 'show']);
Route::get('/dashboard', ShowDashboard::class)->middleware('auth')->name('dashboard');

// Topic 14: route model binding
Route::get('/blog/{post:slug}', fn (Post $post) => $post->title);
Route::get('/posts/{post}/comments/{comment}', fn (Post $post, Comment $comment) => $comment->body)->scopeBindings();
Route::get('/trash/{post}', fn (Post $post) => $post->title)->withTrashed();

// Topic 16: the request object
Route::match(['get', 'post'], '/request-demo', fn (Request $request) => [
    'q' => $request->input('q', ''),
    'page' => $request->integer('page', 1),
    'active' => $request->boolean('active'),
    'tags' => $request->array('tags'),
    'only' => $request->only(['name', 'email']),
    'has_email' => $request->filled('email'),
    'expects_json' => $request->expectsJson(),
    'token' => $request->bearerToken(),
]);

// Topics 17 / 19: inline validation and custom rules
Route::post('/validate-demo', function (Request $request) {
    $data = $request->validate([
        'title' => ['required', 'string', 'max:255'],
        'tags' => ['array', 'max:5'],
        'tags.*' => ['string', 'distinct'],
        'type' => ['nullable', 'in:sale,regular'],
        'discount' => ['required_if:type,sale', 'nullable', 'integer', 'between:1,90'],
        'phone' => ['nullable', new IndianPhone],
        'coupon' => ['nullable', function (string $attr, mixed $value, Closure $fail) {
            if ($value !== 'DIWALI') {
                $fail('That coupon has expired.');
            }
        }],
    ]);

    return response()->json($data);
});

// Topic 20: parameterised middleware
Route::get('/reports', fn () => 'pro reports')->middleware(['auth', 'subscribed:pro']);
Route::get('/billing', fn () => 'billing')->middleware(['auth', 'verified'])->name('billing');   // Topic 57

// Topics 21 / 93: a CSRF-protected web form endpoint
Route::match(['post', 'put'], '/profile', function (UpdateProfileRequest $request) {
    $request->user()->update($request->validated());

    return back()->with('status', 'Profile updated.');
})->middleware('auth');

// Topic 22: responses
Route::get('/responses/{type}', function (string $type) {
    return match ($type) {
        'json' => response()->json(['message' => 'Created'], 201),
        'download' => response()->streamDownload(fn () => print ("id,total\n1,500\n"), 'orders.csv'),
        'redirect' => redirect()->route('posts.index')->with('status', 'Saved.'),
        'empty' => response()->noContent(),
        'forbidden' => abort(403, 'You cannot edit this post.'),
        default => abort(404),
    };
});

// Topic 24: a self-rendering exception
Route::get('/stock-demo', fn () => throw new InsufficientStock('Phone'));

// Topic 48: session authentication
Route::get('/login', fn () => 'login form')->name('login');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');

// Topic 50 / 52 / 93: gates, permissions, roles
Route::get('/admin/reports', fn () => 'reports')->middleware(['auth', 'can:view-reports']);
Route::post('/posts/{post}/publish', fn (Post $post) => 'published')->middleware(['auth', 'can:publish posts']);
Route::get('/analyst-area', fn () => 'analysts')->middleware(['auth', 'role:admin,analyst']);
// Topic 51: policy as route middleware
Route::patch('/posts/{post}/title', fn (Post $post) => 'ok')->middleware('auth')->can('update', 'post');

// Topic 55: a manual rate limiter for any action
Route::post('/otp', function (Request $request) {
    $key = 'otp:'.$request->input('phone');
    if (RateLimiter::tooManyAttempts($key, 3)) {
        return response()->json(['message' => 'Too many codes sent. Wait a few minutes.'], 429);
    }
    RateLimiter::hit($key, 600);

    return ['sent' => true, 'remaining' => RateLimiter::remaining($key, 3)];
});

// Topic 56: signed URL download. Topic 64: route used in the InvoicePaid mail.
Route::get('/invoices/{invoice}/download', fn (Invoice $invoice) => "invoice {$invoice->number}")
    ->name('invoices.download')->middleware('signed');
Route::get('/invoices/{invoice}', fn (Invoice $invoice) => $invoice->number)->middleware('auth')->name('invoices.show');

// Topic 96: protected download from a private disk
Route::get('/invoices/{invoice}/pdf', function (Invoice $invoice) {
    Gate::authorize('view', $invoice);

    return Storage::disk('local')->download($invoice->pdf_path, "invoice-{$invoice->number}.pdf");
})->middleware('auth');

// Topic 57: email verification / password reset routes the framework links to
Route::get('/email/verify', fn () => 'verify your email')->middleware('auth')->name('verification.notice');
Route::get('/reset-password/{token}', fn (string $token) => 'reset form')->name('password.reset');

// Topics 72 / 82: checkout
Route::post('/checkout', CheckoutController::class)->middleware('auth');
Route::get('/orders/{order}', fn (Order $order) => "Order {$order->id}")->middleware('auth')->name('orders.show');

// Topic 73: pay an existing order (the gateway is mocked in the test)
Route::post('/orders/{order}/pay', function (Order $order, PaymentGateway $gateway) {
    try {
        $gateway->charge($order->user, $order->total->paise, "order-{$order->id}");
        $order->update(['status' => OrderStatus::Paid]);
    } catch (CardDeclined $e) {
        $order->update(['status' => OrderStatus::Failed]);

        return back()->withErrors(['payment' => $e->getMessage()]);
    }

    return back();
});

// Topic 98: calling an external API (faked in tests)
Route::post('/orders/{order}/ship', function (Order $order) {
    $response = Http::post('https://api.shiprocket.in/v1/shipments', ['order_id' => $order->id]);
    $order->update(['awb' => $response->json('awb')]);

    return ['awb' => $order->awb];
});

// Topic 86: pipeline of query filters
Route::get('/products', fn () => Pipeline::send(Product::query())
    ->through([Filters\ByCategory::class, Filters\ByPriceRange::class, Filters\Sort::class])
    ->thenReturn()
    ->paginate(20));

// Topic 101: the slow page, fixed (2 queries instead of 1 + 50 + 50)
Route::get('/orders-report', function () {
    $orders = Order::with('user:id,name')->withCount('items')->latest('id')->take(50)->get();

    return $orders->map(fn (Order $o) => "{$o->user->name}: {$o->items_count} items")->all();
});

// Topic 104: payment webhook: verify the HMAC signature, then hand off to a queue
Route::post('/webhooks/razorpay', function (Request $request) {
    $expected = hash_hmac('sha256', $request->getContent(), (string) config('services.razorpay.webhook_secret'));
    abort_unless(hash_equals($expected, (string) $request->header('X-Razorpay-Signature')), 400);
    ProcessPaymentWebhook::dispatch($request->json()->all());

    return response()->noContent();
});

// Topic 13: anything else
Route::fallback(fn () => response()->view('errors.404', [], 404));
