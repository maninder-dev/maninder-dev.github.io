# Laravel examples: topic index

Runnable examples for the Laravel Interview Handbook (topics 1-107). Every topic is proved by a
PHPUnit test in `tests/Feature/Topics/`; the app code it exercises lives in the normal Laravel
places (`app/`, `routes/`, `config/`, `database/`, `resources/views/`, `packages/acme/sms`).

Laravel 13, PHP 8.3, SQLite in-memory for tests (see `phpunit.xml`). Added package: `laravel/sanctum`.

```
php artisan test                          # everything
php artisan test --filter=Topic028        # one topic
```

Reduced or simulated topics (no servers are needed to run anything):

- 42 read/write splitting, 61 Horizon, 78 stateless scaling: config only, asserted by the tests.
- 47 Livewire/Inertia not installed; the Vite part is tested.
- 52 roles/permissions: a minimal home-made RBAC instead of spatie/laravel-permission.
- 67 Redis: the Redis facade is mocked (no Redis server).
- 77 Octane: request switching is simulated with forgetScopedInstances().
- 40 lockForUpdate: SQLite has no row locks, so the test checks the MySQL SQL it compiles to.
- 90 property hooks need PHP 8.4; shown in a comment with the 8.3 equivalent.
- 103 one million emails: scaled down to 25 recipients and a 2-jobs-per-minute limit.

| Topic | Title | Test | Main files |
|---|---|---|---|
| 1 | What is Laravel and Why Use It? | [Topic001_WhatIsLaravelTest](tests/Feature/Topics/Topic001_WhatIsLaravelTest.php) | routes/web.php (/latest-posts), resources/views/posts/index.blade.php |
| 2 | Directory Structure | [Topic002_DirectoryStructureTest](tests/Feature/Topics/Topic002_DirectoryStructureTest.php) | bootstrap/app.php, routes/* |
| 3 | The Request Lifecycle | [Topic003_RequestLifecycleTest](tests/Feature/Topics/Topic003_RequestLifecycleTest.php) | app/Http/Middleware/RecordLifecycle.php, app/Support/Trace.php |
| 4 | The Service Container (IoC Container) | [Topic004_ServiceContainerTest](tests/Feature/Topics/Topic004_ServiceContainerTest.php) | app/Services/PaymentService.php, app/Http/Controllers/PaymentController.php |
| 5 | Binding: bind, singleton, scoped, instance | [Topic005_BindingTest](tests/Feature/Topics/Topic005_BindingTest.php) | app/Providers/AppServiceProvider.php, app/Services/{ReportBuilder,CurrencyConverter,CartManager,InvoiceService}.php |
| 6 | Service Providers | [Topic006_ServiceProvidersTest](tests/Feature/Topics/Topic006_ServiceProvidersTest.php) | app/Providers/AppServiceProvider.php, app/Providers/GeoIpServiceProvider.php |
| 7 | Facades | [Topic007_FacadesTest](tests/Feature/Topics/Topic007_FacadesTest.php) | app/Facades/Currency.php, app/Services/CurrencyConverter.php |
| 8 | Contracts | [Topic008_ContractsTest](tests/Feature/Topics/Topic008_ContractsTest.php) | app/Services/ReportService.php |
| 9 | Configuration and Environment | [Topic009_ConfigurationTest](tests/Feature/Topics/Topic009_ConfigurationTest.php) | config/services.php, config/payments.php, phpunit.xml |
| 10 | Artisan CLI | [Topic010_ArtisanTest](tests/Feature/Topics/Topic010_ArtisanTest.php) | app/Console/Commands/PruneOldLogs.php |
| 11 | Helpers and Collections | [Topic011_CollectionsTest](tests/Feature/Topics/Topic011_CollectionsTest.php) | (test only) |
| 12 | Routing Basics | [Topic012_RoutingBasicsTest](tests/Feature/Topics/Topic012_RoutingBasicsTest.php) | routes/web.php |
| 13 | Route Groups, Prefixes and Fallbacks | [Topic013_RouteGroupsTest](tests/Feature/Topics/Topic013_RouteGroupsTest.php) | routes/web.php, resources/views/errors/404.blade.php |
| 14 | Route Model Binding | [Topic014_RouteModelBindingTest](tests/Feature/Topics/Topic014_RouteModelBindingTest.php) | routes/web.php (/blog/{post:slug}, scopeBindings, withTrashed) |
| 15 | Controllers and Resource Controllers | [Topic015_ResourceControllersTest](tests/Feature/Topics/Topic015_ResourceControllersTest.php) | app/Http/Controllers/PostController.php, app/Http/Controllers/ShowDashboard.php |
| 16 | The Request Object | [Topic016_RequestObjectTest](tests/Feature/Topics/Topic016_RequestObjectTest.php) | routes/web.php (/request-demo) |
| 17 | Validation | [Topic017_ValidationTest](tests/Feature/Topics/Topic017_ValidationTest.php) | routes/web.php (/validate-demo) |
| 18 | Form Request Classes | [Topic018_FormRequestTest](tests/Feature/Topics/Topic018_FormRequestTest.php) | app/Http/Requests/StorePostRequest.php |
| 19 | Custom Validation Rules | [Topic019_CustomRulesTest](tests/Feature/Topics/Topic019_CustomRulesTest.php) | app/Rules/IndianPhone.php |
| 20 | Middleware | [Topic020_MiddlewareTest](tests/Feature/Topics/Topic020_MiddlewareTest.php) | app/Http/Middleware/EnsureUserIsSubscribed.php, bootstrap/app.php |
| 21 | CSRF Protection | [Topic021_CsrfTest](tests/Feature/Topics/Topic021_CsrfTest.php) | bootstrap/app.php, tests/Support/StrictCsrf.php |
| 22 | Responses | [Topic022_ResponsesTest](tests/Feature/Topics/Topic022_ResponsesTest.php) | routes/web.php (/responses/{type}) |
| 23 | API Resources (Transformers) | [Topic023_ApiResourcesTest](tests/Feature/Topics/Topic023_ApiResourcesTest.php) | app/Http/Resources/{PostResource,UserResource}.php |
| 24 | Exception Handling | [Topic024_ExceptionHandlingTest](tests/Feature/Topics/Topic024_ExceptionHandlingTest.php) | bootstrap/app.php, app/Exceptions/*.php |
| 25 | Eloquent Models | [Topic025_EloquentModelsTest](tests/Feature/Topics/Topic025_EloquentModelsTest.php) | app/Models/Post.php, app/Enums/PostStatus.php |
| 26 | Mass Assignment | [Topic026_MassAssignmentTest](tests/Feature/Topics/Topic026_MassAssignmentTest.php) | app/Models/User.php |
| 27 | Relationships | [Topic027_RelationshipsTest](tests/Feature/Topics/Topic027_RelationshipsTest.php) | app/Models/{User,Post,Comment,Tag,Role,Country}.php |
| 28 | The N+1 Problem and Eager Loading | [Topic028_NPlusOneTest](tests/Feature/Topics/Topic028_NPlusOneTest.php) | app/Models/Post.php, app/Providers/AppServiceProvider.php |
| 29 | Querying Relationships | [Topic029_QueryingRelationshipsTest](tests/Feature/Topics/Topic029_QueryingRelationshipsTest.php) | app/Models/{Post,Comment,User}.php |
| 30 | Query Builder vs Eloquent vs Raw SQL | [Topic030_QueryBuilderVsEloquentTest](tests/Feature/Topics/Topic030_QueryBuilderVsEloquentTest.php) | (test only) |
| 31 | Local and Global Scopes | [Topic031_ScopesTest](tests/Feature/Topics/Topic031_ScopesTest.php) | app/Models/Post.php, app/Models/Concerns/BelongsToTenant.php |
| 32 | Accessors, Mutators and Casts | [Topic032_AccessorsMutatorsCastsTest](tests/Feature/Topics/Topic032_AccessorsMutatorsCastsTest.php) | app/Models/User.php |
| 33 | Model Events and Observers | [Topic033_ObserversTest](tests/Feature/Topics/Topic033_ObserversTest.php) | app/Observers/PostObserver.php, app/Jobs/NotifyFollowers.php |
| 34 | Soft Deletes | [Topic034_SoftDeletesTest](tests/Feature/Topics/Topic034_SoftDeletesTest.php) | app/Models/Post.php (SoftDeletes, Prunable) |
| 35 | Migrations | [Topic035_MigrationsTest](tests/Feature/Topics/Topic035_MigrationsTest.php) | database/migrations/2026_01_01_000300_create_orders_table.php, ..._000400_add_currency_to_orders_table.php |
| 36 | Seeders and Factories | [Topic036_SeedersFactoriesTest](tests/Feature/Topics/Topic036_SeedersFactoriesTest.php) | database/factories/*.php, database/seeders/DatabaseSeeder.php |
| 37 | Pagination | [Topic037_PaginationTest](tests/Feature/Topics/Topic037_PaginationTest.php) | (test only) |
| 38 | Processing Large Datasets: chunk, lazy, cursor | [Topic038_LargeDatasetsTest](tests/Feature/Topics/Topic038_LargeDatasetsTest.php) | (test only) |
| 39 | Database Transactions | [Topic039_TransactionsTest](tests/Feature/Topics/Topic039_TransactionsTest.php) | (test only) |
| 40 | Locking and Race Conditions | [Topic040_LockingTest](tests/Feature/Topics/Topic040_LockingTest.php) | app/Models/Seat.php |
| 41 | Database Indexes and Query Performance | [Topic041_IndexesTest](tests/Feature/Topics/Topic041_IndexesTest.php) | (test only) |
| 42 | Multiple Database Connections and Read/Write Splitting | [Topic042_MultipleConnectionsTest](tests/Feature/Topics/Topic042_MultipleConnectionsTest.php) | config/database.php (mysql read/write, analytics) |
| 43 | Blade Templating Basics | [Topic043_BladeBasicsTest](tests/Feature/Topics/Topic043_BladeBasicsTest.php) | resources/views/posts/*.blade.php |
| 44 | Layouts: Inheritance vs Components | [Topic044_LayoutsTest](tests/Feature/Topics/Topic044_LayoutsTest.php) | resources/views/layouts/app.blade.php, resources/views/components/layout.blade.php, resources/views/demo/inherit.blade.php |
| 45 | Blade Components | [Topic045_BladeComponentsTest](tests/Feature/Topics/Topic045_BladeComponentsTest.php) | app/View/Components/Alert.php, resources/views/components/{alert,badge}.blade.php |
| 46 | View Composers and Shared Data | [Topic046_ViewComposersTest](tests/Feature/Topics/Topic046_ViewComposersTest.php) | app/Providers/AppServiceProvider.php, resources/views/layouts/app.blade.php |
| 47 | Livewire, Inertia and Vite | [Topic047_LivewireInertiaViteTest](tests/Feature/Topics/Topic047_LivewireInertiaViteTest.php) | (test only; Livewire/Inertia not installed) |
| 48 | Authentication Basics and Starter Kits | [Topic048_AuthenticationTest](tests/Feature/Topics/Topic048_AuthenticationTest.php) | app/Http/Controllers/AuthController.php |
| 49 | Sanctum vs Passport (API Authentication) | [Topic049_SanctumTest](tests/Feature/Topics/Topic049_SanctumTest.php) | routes/api.php, config/sanctum.php |
| 50 | Authorization: Gates | [Topic050_GatesTest](tests/Feature/Topics/Topic050_GatesTest.php) | app/Providers/AppServiceProvider.php |
| 51 | Authorization: Policies | [Topic051_PoliciesTest](tests/Feature/Topics/Topic051_PoliciesTest.php) | app/Policies/PostPolicy.php |
| 52 | Roles and Permissions | [Topic052_RolesPermissionsTest](tests/Feature/Topics/Topic052_RolesPermissionsTest.php) | app/Models/{User,Role,Permission}.php, app/Http/Middleware/EnsureRole.php |
| 53 | Hashing and Encryption | [Topic053_HashingEncryptionTest](tests/Feature/Topics/Topic053_HashingEncryptionTest.php) | (test only) |
| 54 | Protection Against Common Attacks | [Topic054_CommonAttacksTest](tests/Feature/Topics/Topic054_CommonAttacksTest.php) | app/Http/Middleware/SecurityHeaders.php |
| 55 | Rate Limiting | [Topic055_RateLimitingTest](tests/Feature/Topics/Topic055_RateLimitingTest.php) | app/Providers/AppServiceProvider.php, routes/web.php (/otp) |
| 56 | Signed URLs | [Topic056_SignedUrlsTest](tests/Feature/Topics/Topic056_SignedUrlsTest.php) | routes/web.php (invoices.download) |
| 57 | Email Verification and Password Reset | [Topic057_EmailVerificationPasswordResetTest](tests/Feature/Topics/Topic057_EmailVerificationPasswordResetTest.php) | app/Models/User.php (MustVerifyEmail), routes/web.php |
| 58 | Queues and Jobs | [Topic058_QueuesJobsTest](tests/Feature/Topics/Topic058_QueuesJobsTest.php) | app/Jobs/GenerateInvoicePdf.php, app/Services/PdfService.php |
| 59 | Job Chaining, Batching and Uniqueness | [Topic059_ChainBatchUniqueTest](tests/Feature/Topics/Topic059_ChainBatchUniqueTest.php) | app/Jobs/{PodcastStep,SyncOrderToErp}.php |
| 60 | Job Middleware and Rate Limiting Jobs | [Topic060_JobMiddlewareTest](tests/Feature/Topics/Topic060_JobMiddlewareTest.php) | app/Jobs/CallShippingApi.php |
| 61 | Horizon and Queue Monitoring | [Topic061_HorizonTest](tests/Feature/Topics/Topic061_HorizonTest.php) | config/horizon.php (config only) |
| 62 | Events and Listeners | [Topic062_EventsListenersTest](tests/Feature/Topics/Topic062_EventsListenersTest.php) | app/Events/OrderPlaced.php, app/Listeners/*.php, app/Mail/OrderConfirmed.php |
| 63 | Task Scheduling | [Topic063_SchedulingTest](tests/Feature/Topics/Topic063_SchedulingTest.php) | routes/console.php |
| 64 | Mail and Notifications | [Topic064_MailNotificationsTest](tests/Feature/Topics/Topic064_MailNotificationsTest.php) | app/Mail/OrderShipped.php, app/Notifications/InvoicePaid.php |
| 65 | Broadcasting (Real-Time Events) | [Topic065_BroadcastingTest](tests/Feature/Topics/Topic065_BroadcastingTest.php) | app/Events/MessageSent.php, routes/channels.php |
| 66 | Caching | [Topic066_CachingTest](tests/Feature/Topics/Topic066_CachingTest.php) | (test only) |
| 67 | Redis in Laravel | [Topic067_RedisTest](tests/Feature/Topics/Topic067_RedisTest.php) | app/Services/Leaderboard.php |
| 68 | File Storage | [Topic068_FileStorageTest](tests/Feature/Topics/Topic068_FileStorageTest.php) | (test only) |
| 69 | Testing in Laravel: PHPUnit and Pest | [Topic069_PhpUnitAndPestTest](tests/Feature/Topics/Topic069_PhpUnitAndPestTest.php) | (test only; Pest syntax in the docblock) |
| 70 | Database in Tests | [Topic070_DatabaseInTestsTest](tests/Feature/Topics/Topic070_DatabaseInTestsTest.php) | app/Models/{Order,OrderItem}.php |
| 71 | Testing APIs | [Topic071_TestingApisTest](tests/Feature/Topics/Topic071_TestingApisTest.php) | app/Http/Controllers/Api/V1/OrderController.php, app/Http/Resources/OrderResource.php |
| 72 | Fakes: Queue, Mail, Event, Notification, Storage, Http | [Topic072_FakesTest](tests/Feature/Topics/Topic072_FakesTest.php) | app/Http/Controllers/CheckoutController.php, app/Services/Payments/RazorpayGateway.php |
| 73 | Mocking Dependencies | [Topic073_MockingTest](tests/Feature/Topics/Topic073_MockingTest.php) | routes/web.php (/orders/{order}/pay) |
| 74 | Unit Testing Plain Classes | [Topic074_UnitTestingPlainClassesTest](tests/Feature/Topics/Topic074_UnitTestingPlainClassesTest.php) | app/Services/DiscountCalculator.php |
| 75 | Production Optimization Commands | [Topic075_ProductionOptimizationTest](tests/Feature/Topics/Topic075_ProductionOptimizationTest.php) | (test only) |
| 76 | Finding Performance Problems | [Topic076_FindingPerformanceProblemsTest](tests/Feature/Topics/Topic076_FindingPerformanceProblemsTest.php) | app/Providers/AppServiceProvider.php (shouldBeStrict) |
| 77 | Laravel Octane | [Topic077_OctaneTest](tests/Feature/Topics/Topic077_OctaneTest.php) | app/Services/CartService.php, app/Providers/AppServiceProvider.php |
| 78 | Sessions and Stateless Scaling | [Topic078_StatelessScalingTest](tests/Feature/Topics/Topic078_StatelessScalingTest.php) | config/{session,cache,queue,filesystems,logging}.php |
| 79 | Logging | [Topic079_LoggingTest](tests/Feature/Topics/Topic079_LoggingTest.php) | config/logging.php |
| 80 | Deployment and Zero Downtime | [Topic080_DeploymentTest](tests/Feature/Topics/Topic080_DeploymentTest.php) | scripts/deploy.sh |
| 81 | API Versioning and Best Practices | [Topic081_ApiVersioningTest](tests/Feature/Topics/Topic081_ApiVersioningTest.php) | routes/api.php, routes/api_v2.php, app/Http/Controllers/Api/V2/OrderController.php |
| 82 | Fat Models, Thin Controllers, and Service Classes | [Topic082_ServiceClassesTest](tests/Feature/Topics/Topic082_ServiceClassesTest.php) | app/Services/{CheckoutService,InventoryService}.php, app/Http/Controllers/CheckoutController.php |
| 83 | Action Classes | [Topic083_ActionClassesTest](tests/Feature/Topics/Topic083_ActionClassesTest.php) | app/Actions/PublishPost.php |
| 84 | The Repository Pattern (and When Not to Use It) | [Topic084_RepositoryPatternTest](tests/Feature/Topics/Topic084_RepositoryPatternTest.php) | app/Repositories/{OrderRepository,EloquentOrderRepository}.php |
| 85 | DTOs and Value Objects | [Topic085_DtosValueObjectsTest](tests/Feature/Topics/Topic085_DtosValueObjectsTest.php) | app/Data/CreateOrderData.php, app/ValueObjects/Money.php |
| 86 | The Pipeline Pattern | [Topic086_PipelineTest](tests/Feature/Topics/Topic086_PipelineTest.php) | app/Pipelines/Filters/*.php, routes/web.php (/products) |
| 87 | Macros, Traits and Custom Casts | [Topic087_MacrosTraitsCastsTest](tests/Feature/Topics/Topic087_MacrosTraitsCastsTest.php) | app/Providers/AppServiceProvider.php, app/Models/Concerns/HasUuid.php, app/Casts/MoneyCast.php |
| 88 | Multi-Tenancy Approaches | [Topic088_MultiTenancyTest](tests/Feature/Topics/Topic088_MultiTenancyTest.php) | app/Models/Concerns/BelongsToTenant.php, app/Support/CurrentTenant.php, app/helpers.php |
| 89 | Building a Package | [Topic089_BuildingAPackageTest](tests/Feature/Topics/Topic089_BuildingAPackageTest.php) | packages/acme/sms/* |
| 90 | Modern PHP Features Used in Laravel | [Topic090_ModernPhpTest](tests/Feature/Topics/Topic090_ModernPhpTest.php) | app/Enums/OrderStatus.php, app/ValueObjects/Address.php |
| 91 | SOLID Principles in Laravel | [Topic091_SolidTest](tests/Feature/Topics/Topic091_SolidTest.php) | app/Contracts/PaymentGateway.php, app/Services/Payments/*.php, config/payments.php |
| 92 | Framework Fundamentals Questions | [Topic092_FundamentalsQuestionsTest](tests/Feature/Topics/Topic092_FundamentalsQuestionsTest.php) | app/Services/{InvoiceMailer,PdfRenderer,GeoIp}.php |
| 93 | Routing, Requests and Middleware Questions | [Topic093_RoutingRequestsMiddlewareQuestionsTest](tests/Feature/Topics/Topic093_RoutingRequestsMiddlewareQuestionsTest.php) | app/Http/Requests/UpdateProfileRequest.php, app/Http/Middleware/EnsureRole.php, bootstrap/app.php |
| 94 | Eloquent Questions | [Topic094_EloquentQuestionsTest](tests/Feature/Topics/Topic094_EloquentQuestionsTest.php) | app/Models/{Post,Order,Product,Tag}.php |
| 95 | Relationships Questions | [Topic095_RelationshipsQuestionsTest](tests/Feature/Topics/Topic095_RelationshipsQuestionsTest.php) | app/Models/{Project,Video,Comment,Country}.php |
| 96 | Authentication and Security Questions | [Topic096_AuthSecurityQuestionsTest](tests/Feature/Topics/Topic096_AuthSecurityQuestionsTest.php) | app/Http/Controllers/AuthController.php, app/Policies/InvoicePolicy.php |
| 97 | Queues, Events and Cache Questions | [Topic097_QueuesEventsCacheQuestionsTest](tests/Feature/Topics/Topic097_QueuesEventsCacheQuestionsTest.php) | app/Jobs/{SendReceipt,SyncToCrm}.php, app/Observers/ProductObserver.php |
| 98 | Testing Questions | [Topic098_TestingQuestionsTest](tests/Feature/Topics/Topic098_TestingQuestionsTest.php) | tests/TestCase.php (preventStrayRequests), routes/web.php (/orders/{order}/ship) |
| 99 | Performance and Deployment Questions | [Topic099_PerformanceDeploymentQuestionsTest](tests/Feature/Topics/Topic099_PerformanceDeploymentQuestionsTest.php) | app/Console/Commands/BackfillOrderCurrency.php, scripts/deploy.sh |
| 100 | PHP Language Questions | [Topic100_PhpLanguageQuestionsTest](tests/Feature/Topics/Topic100_PhpLanguageQuestionsTest.php) | (test only) |
| 101 | Scenario: A Page Is Slow. How Do You Debug It? | [Topic101_SlowPageScenarioTest](tests/Feature/Topics/Topic101_SlowPageScenarioTest.php) | routes/web.php (/orders-report) |
| 102 | Scenario: Prevent Double Orders and Overselling | [Topic102_DoubleOrdersOversellingTest](tests/Feature/Topics/Topic102_DoubleOrdersOversellingTest.php) | app/Http/Controllers/Api/V1/OrderController.php (store) |
| 103 | Scenario: Send 1 Million Emails | [Topic103_MillionEmailsTest](tests/Feature/Topics/Topic103_MillionEmailsTest.php) | app/Console/Commands/SendCampaign.php, app/Jobs/SendCampaignChunk.php, app/Models/CampaignSend.php |
| 104 | Scenario: Design a Multi-Vendor E-Commerce API in Laravel | [Topic104_MultiVendorApiTest](tests/Feature/Topics/Topic104_MultiVendorApiTest.php) | app/Policies/ProductPolicy.php, routes/web.php (/webhooks/razorpay), app/Jobs/ProcessPaymentWebhook.php |
| 105 | Scenario: Securing a Laravel Application | [Topic105_SecuringTheAppTest](tests/Feature/Topics/Topic105_SecuringTheAppTest.php) | app/Providers/AppServiceProvider.php, app/Http/Middleware/SecurityHeaders.php |
| 106 | Laravel vs Other Frameworks | [Topic106_LaravelVsOtherFrameworksTest](tests/Feature/Topics/Topic106_LaravelVsOtherFrameworksTest.php) | routes/api.php (/api/users) |
| 107 | Questions to Ask the Interviewer | [Topic107_QuestionsToAskTest](tests/Feature/Topics/Topic107_QuestionsToAskTest.php) | (test only) |
