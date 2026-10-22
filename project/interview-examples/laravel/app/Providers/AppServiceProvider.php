<?php

namespace App\Providers;

use App\Contracts\PaymentGateway;
use App\Models\Post;
use App\Models\User;
use App\Models\Video;
use App\Repositories\EloquentOrderRepository;
use App\Repositories\OrderRepository;
use App\Services\CartManager;
use App\Services\CartService;
use App\Services\CurrencyConverter;
use App\Services\InvoiceService;
use App\Services\Payments\RazorpayGateway;
use App\Services\Payments\StripeGateway;
use App\Services\ReportBuilder;
use App\Support\CurrentTenant;
use App\Support\Trace;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

/**
 * Topic 6: register() only binds into the container; boot() runs after every provider is
 * registered, so it may use anything (gates, rate limiters, macros, composers).
 */
class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Topic 5: bind / singleton / scoped / contextual
        $this->app->bind(ReportBuilder::class);                                  // new object every resolve
        $this->app->singleton(CurrencyConverter::class, fn () => new CurrencyConverter(config('services.fx.key')));
        $this->app->scoped(CartManager::class);                                  // one per request / job
        $this->app->scoped(CurrentTenant::class);                                // Topic 88
        $this->app->singleton(Trace::class);

        // Topic 91: dependency inversion, implementation chosen by config
        $this->app->bind(PaymentGateway::class, fn () => match (config('payments.driver')) {
            'stripe' => new StripeGateway(config('services.stripe.secret')),
            default => new RazorpayGateway(config('services.razorpay.key'), config('services.razorpay.secret')),
        });

        // Contextual binding: InvoiceService always gets Razorpay, whatever the default is
        $this->app->when(InvoiceService::class)
            ->needs(PaymentGateway::class)
            ->give(fn () => new RazorpayGateway(config('services.razorpay.key'), config('services.razorpay.secret')));

        // Topics 77 / 99: per-request service holding the current user (scoped, NOT singleton)
        $this->app->scoped(CartService::class, fn ($app) => new CartService($app['request']->user()));

        // Topic 84: repository interface -> Eloquent implementation
        $this->app->bind(OrderRepository::class, EloquentOrderRepository::class);
    }

    public function boot(): void
    {
        // Topics 28, 76, 99: fail fast in development (lazy loading, missing / discarded attributes)
        Model::shouldBeStrict(! $this->app->isProduction());

        // Topic 95: store short morph names instead of class names
        Relation::enforceMorphMap(['post' => Post::class, 'video' => Video::class, 'user' => User::class]);

        // Topic 105: production hardening
        if ($this->app->isProduction()) {
            URL::forceScheme('https');
            DB::prohibitDestructiveCommands();
        }

        // Topic 50: gates, with a super-admin bypass. Topic 52: permissions stored in the DB.
        Gate::before(function (User $user, string $ability) {
            if ($user->is_super_admin) {
                return true;
            }
            if (str_contains($ability, ' ') && $user->hasPermission($ability)) {
                return true;   // e.g. Gate::allows('publish posts')
            }

            return null;
        });
        Gate::define('view-reports', fn (User $user) => in_array($user->role, ['admin', 'analyst'], true));
        Gate::define('view-dashboard', fn (User $user) => $user->is_admin);

        // Topic 55: named rate limiters. Topics 60 / 103: limiters used by job middleware.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(5)->by($request->input('email').$request->ip())
                ->response(fn () => response('Too many login attempts. Try again in a minute.', 429)),
        ]);
        RateLimiter::for('shipping-api', fn () => Limit::perMinute(2));
        RateLimiter::for('mail-provider', fn () => Limit::perSecond(14));

        // Topic 87: macros
        Str::macro('initials', fn (string $name) => collect(explode(' ', $name))
            ->map(fn ($w) => mb_substr($w, 0, 1))->join(''));
        // (Laravel 11+ already ships whereLike, so the macro gets its own name)
        Builder::macro('whereContains', function (string $column, string $term) {
            /** @var Builder $this */
            return $this->where($column, 'like', "%{$term}%");
        });

        // Topic 46: shared data and a view composer
        View::share('appName', config('app.name'));
        View::composer(['layouts.app', 'partials.nav'], function ($view) {
            $view->with('unreadCount', auth()->user()?->unreadNotifications()->count() ?? 0);
        });
    }
}
